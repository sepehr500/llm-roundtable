import type { DebateState, Participant } from '../shared/types.ts';
import { sessionManager } from './session-manager.ts';
import { streamLLMResponse, getLLMResponse } from './llm-service.ts';

/**
 * Core debate orchestration engine
 */
export class DebateEngine {
  private sessionId: string;
  private isProcessing: boolean = false;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * Generate debate positions from a topic
   */
  async generatePositions(): Promise<string[]> {
    const state = sessionManager.getSession(this.sessionId);
    if (!state) throw new Error('Session not found');

    const systemPrompt = `You are a debate moderator helping to identify diverse positions on a topic.`;
    const userPrompt = `Given the topic "${state.topic}", suggest 2 distinct, opposing positions that could be argued. Each position should be:
- Clear and specific
- Genuinely debatable (not obviously right or wrong)
- Directly opposing each other
- Able to be defended with logical arguments

Return ONLY a JSON array of 2 position strings, like: ["position 1", "position 2"]`;

    const response = await getLLMResponse('google/gemini-3-flash-preview', systemPrompt, userPrompt);

    // Try to parse JSON response
    try {
      const positions = JSON.parse(response.trim());
      if (Array.isArray(positions)) {
        return positions;
      }
    } catch (error) {
      // If parsing fails, try to extract positions from text
      const matches = response.match(/"([^"]+)"/g);
      if (matches) {
        return matches.map(m => m.slice(1, -1));
      }
    }

    // Fallback: return generic positions
    return [`Support ${state.topic}`, `Oppose ${state.topic}`, `Moderate view on ${state.topic}`];
  }

  /**
   * Run research phase - all participants research their positions in parallel
   */
  async runResearchPhase(): Promise<void> {
    const state = sessionManager.getSession(this.sessionId);
    if (!state) throw new Error('Session not found');

    console.log(`[${this.sessionId}] Starting research phase with ${state.participants.length} participants`);

    // Run research for all participants in parallel
    const researchPromises = state.participants.map(participant =>
      this.runParticipantResearch(participant)
    );

    await Promise.all(researchPromises);

    console.log(`[${this.sessionId}] Research phase complete, waiting for user confirmation`);

    // Transition to opening-ready state
    sessionManager.updateSession(this.sessionId, { phase: 'opening-ready' });
    sessionManager.broadcast(this.sessionId, { type: 'phase-change', phase: 'opening-ready' });
  }

  /**
   * Research phase for a single participant
   */
  private async runParticipantResearch(participant: Participant): Promise<void> {
    const state = sessionManager.getSession(this.sessionId);
    if (!state) return;

    const systemPrompt = state.customSystemPrompt || `You are a debater preparing to argue for a specific position. Think through your key arguments and evidence.`;
    const userPrompt = `Topic: ${state.topic}
Your Position: ${participant.position}

Think through your key arguments for this position. Consider:
- Main points that support your position
- Potential counterarguments and how to address them
- Evidence or reasoning you'll use
- Your overall debate strategy

Share your research and preparation thoughts (2-3 paragraphs).`;

    let fullContent = '';

    await streamLLMResponse(
      participant.model,
      systemPrompt,
      userPrompt,
      (chunk) => {
        fullContent += chunk;
        sessionManager.broadcast(this.sessionId, {
          type: 'stream-chunk',
          participantId: participant.id,
          chunk
        });
      },
      () => {
        // Save to messages array
        state.messages.push({
          id: crypto.randomUUID(),
          participantId: participant.id,
          content: fullContent,
          timestamp: Date.now(),
          phase: 'research',
          messageType: 'research'
        });

        sessionManager.broadcast(this.sessionId, {
          type: 'stream-complete',
          participantId: participant.id,
          messageType: 'research'
        });
        state.researchComplete.add(participant.id);
      }
    );
  }

  /**
   * Run opening statements phase - sequential turn-taking
   */
  async runOpeningStatements(): Promise<void> {
    const state = sessionManager.getSession(this.sessionId);
    if (!state) throw new Error('Session not found');

    for (let i = 0; i < state.participants.length; i++) {
      const participant = state.participants[i];
      if (participant) {
        await this.executeOpeningStatement(participant);
      }
    }

    // Transition to debate-ready state
    sessionManager.updateSession(this.sessionId, {
      phase: 'debate-ready',
      currentTurn: 0,
      roundNumber: 1
    });
    sessionManager.broadcast(this.sessionId, { type: 'phase-change', phase: 'debate-ready' });
  }

  /**
   * Execute opening statement for a single participant
   */
  private async executeOpeningStatement(participant: Participant): Promise<void> {
    const state = sessionManager.getSession(this.sessionId);
    if (!state) return;

    const systemPrompt = state.customSystemPrompt || `You are a skilled debater presenting your opening statement.`;
    const userPrompt = `Topic: ${state.topic}
Your Position: ${participant.position}

Give a compelling 2-3 minute opening statement for your position. Your statement should:
- Clearly state your position
- Present your strongest arguments
- Be persuasive and engaging
- Set the tone for the debate`;

    // Broadcast turn change
    sessionManager.broadcast(this.sessionId, {
      type: 'turn-change',
      participantId: participant.id
    });

    let fullContent = '';

    await streamLLMResponse(
      participant.model,
      systemPrompt,
      userPrompt,
      (chunk) => {
        fullContent += chunk;
        sessionManager.broadcast(this.sessionId, {
          type: 'stream-chunk',
          participantId: participant.id,
          chunk
        });
      },
      () => {
        // Save to messages array
        state.messages.push({
          id: crypto.randomUUID(),
          participantId: participant.id,
          content: fullContent,
          timestamp: Date.now(),
          phase: 'opening-statements',
          messageType: 'statement'
        });

        sessionManager.broadcast(this.sessionId, {
          type: 'stream-complete',
          participantId: participant.id,
          messageType: 'statement'
        });
      }
    );
  }

  /**
   * Run debate rounds - participants take turns for multiple rounds
   */
  async runDebateRounds(): Promise<void> {
    const state = sessionManager.getSession(this.sessionId);
    if (!state) throw new Error('Session not found');

    for (let round = 1; round <= state.maxRounds; round++) {
      sessionManager.updateSession(this.sessionId, { roundNumber: round });

      for (let i = 0; i < state.participants.length; i++) {
        const participant = state.participants[i];
        if (participant) {
          await this.executeDebateTurn(participant);
        }
      }
    }

    // Transition to judging-ready state
    sessionManager.updateSession(this.sessionId, { phase: 'judging-ready' });
    sessionManager.broadcast(this.sessionId, { type: 'phase-change', phase: 'judging-ready' });
  }

  /**
   * Execute a single debate turn for a participant
   */
  private async executeDebateTurn(participant: Participant): Promise<void> {
    const state = sessionManager.getSession(this.sessionId);
    if (!state) return;

    // Build context from recent messages
    const context = this.buildContext(state, participant);

    const systemPrompt = state.customSystemPrompt || `You are a skilled debater in an active debate. Engage with other participants' arguments.`;
    const userPrompt = context;

    // Broadcast turn change
    sessionManager.broadcast(this.sessionId, {
      type: 'turn-change',
      participantId: participant.id
    });

    let fullContent = '';

    await streamLLMResponse(
      participant.model,
      systemPrompt,
      userPrompt,
      (chunk) => {
        fullContent += chunk;
        sessionManager.broadcast(this.sessionId, {
          type: 'stream-chunk',
          participantId: participant.id,
          chunk
        });
      },
      () => {
        // Save to messages array
        state.messages.push({
          id: crypto.randomUUID(),
          participantId: participant.id,
          content: fullContent,
          timestamp: Date.now(),
          phase: 'debate',
          messageType: 'statement'
        });

        sessionManager.broadcast(this.sessionId, {
          type: 'stream-complete',
          participantId: participant.id,
          messageType: 'statement'
        });
      }
    );
  }

  /**
   * Build context for a debate turn
   */
  private buildContext(state: DebateState, participant: Participant): string {
    // Get recent messages (last 10 or all debate/opening messages)
    const recentMessages = state.messages
      .filter(m => m.phase === 'debate' || m.phase === 'opening-statements')
      .slice(-10);

    const messageContext = recentMessages.map(m => {
      const p = state.participants.find(p => p.id === m.participantId);
      return `${p?.name} (${p?.position}): ${m.content}`;
    }).join('\n\n');

    return `Topic: ${state.topic}
Your Position: ${participant.position}
Round: ${state.roundNumber} of ${state.maxRounds}

Recent discussion:
${messageContext}

Your turn: Continue the debate. You may:
- Respond to another participant's argument
- Make a new point supporting your position
- Ask a question to another participant
- Challenge an opposing view

Keep your response focused and impactful (2-3 paragraphs).`;
  }

  /**
   * Run judging phase - neutral judge evaluates the debate
   */
  async runJudging(): Promise<void> {
    const state = sessionManager.getSession(this.sessionId);
    if (!state) throw new Error('Session not found');

    // Build full transcript
    const transcript = state.messages
      .filter(m => m.phase === 'opening-statements' || m.phase === 'debate')
      .map(m => {
        const p = state.participants.find(p => p.id === m.participantId);
        return `${p?.name} (${p?.position}): ${m.content}`;
      }).join('\n\n---\n\n');

    const systemPrompt = `You are a neutral, experienced debate judge. Evaluate debates based on argument quality, evidence, and persuasiveness.`;
    const userPrompt = `Topic: ${state.topic}

Debate Transcript:
${transcript}

As a neutral judge, evaluate this debate and determine the winner. Consider:
- Strength and clarity of arguments
- Use of evidence and reasoning
- Persuasiveness and rhetoric
- Responses to counterarguments

Format your response as:
WINNER: [Position]
REASONING: [Your detailed reasoning for the decision]`;

    let fullJudgment = '';

    const judgeModel = state.judgeModel || 'google/gemini-3-flash-preview'; // Fallback check

    await streamLLMResponse(
      judgeModel,
      systemPrompt,
      userPrompt,
      (chunk) => {
        fullJudgment += chunk;
        sessionManager.broadcast(this.sessionId, {
          type: 'stream-chunk',
          participantId: 'judge',
          chunk
        });
      },
      () => {
        // Extract winner from judgment
        const winnerMatch = fullJudgment.match(/WINNER:\s*([^\n]+)/i);
        const reasoningMatch = fullJudgment.match(/REASONING:\s*([\\s\\S]+)/i);

        const winner = winnerMatch ? winnerMatch[1]?.trim() ?? 'Unable to determine' : 'Unable to determine';
        const reasoning = reasoningMatch ? reasoningMatch[1]?.trim() ?? fullJudgment : fullJudgment;

        sessionManager.updateSession(this.sessionId, {
          phase: 'complete',
          winner,
          judgeReasoning: reasoning
        });

        sessionManager.broadcast(this.sessionId, {
          type: 'stream-complete',
          participantId: 'judge',
          messageType: 'judgment'
        });

        sessionManager.broadcast(this.sessionId, {
          type: 'debate-complete',
          winner,
          judgeReasoning: reasoning
        });

        sessionManager.broadcast(this.sessionId, {
          type: 'phase-change',
          phase: 'complete'
        });
      }
    );
  }
}
