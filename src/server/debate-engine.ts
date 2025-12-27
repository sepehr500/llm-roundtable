import type { DebateState, Participant } from '../shared/types.ts';
import { sessionManager } from './session-manager.ts';
import { streamLLMResponse, getLLMResponse, getStructuredLLMResponse } from './llm-service.ts';
import { jsonSchema } from 'ai';

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
   * Generate a summary of all judge verdicts
   */
  private async generateVerdictsSummary(topic: string, verdicts: any[], model: string): Promise<string> {
    const verdictsText = verdicts.map(v => 
      `Judge: ${v.judgeName} (${v.model})
Vote: ${v.winner}
Reasoning: ${v.reasoning}`
    ).join('\n\n---\n\n');

    const systemPrompt = "You are a Chief Justice reviewing the individual verdicts of a panel of judges. Your goal is to synthesize their decisions into a cohesive summary.";
    const userPrompt = `Topic: ${topic}

Here are the verdicts from 3 independent judges:

${verdictsText}

Please provide a concise "Majority Opinion" summary (1-2 paragraphs).
- Identify the consensus view (if any) or the main points of contention.
- Highlight the strongest arguments that swayed the judges.
- Synthesize the overall outcome of the debate.
- Do NOT list each judge's opinion individually; instead, weave them into a narrative about the debate's conclusion.`;

    return await getLLMResponse(model, systemPrompt, userPrompt);
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

    // Create a list of valid positions for the judges to choose from
    const positionsList = state.participants
      .map(p => `- ${p.position}`)
      .join('\n');

    const systemPrompt = `You are a neutral, experienced debate judge. Evaluate debates based on argument quality, evidence, and persuasiveness.`;
    const userPrompt = `Topic: ${state.topic}

Valid Positions (you must vote for one of these exactly as written):
${positionsList}

Debate Transcript:
${transcript}

As a neutral judge, evaluate this debate and determine the winner. Consider:
- Strength and clarity of arguments
- Use of evidence and reasoning
- Persuasiveness and rhetoric
- Responses to counterarguments

Format your reasoning using markdown with:
- **Bold** for emphasis on key points
- Headers (##, ###) to organize your analysis
- Bullet points or numbered lists for clarity
- Quote blocks (>) for citing specific arguments`;

    // Define typed JSON schema for the judge verdict
    const judgmentSchema = jsonSchema<{
      winner: string;
      reasoning: string;
    }>({
      type: "object",
      properties: {
        winner: {
          type: "string",
          description: "The exact position from the list above that you believe won the debate"
        },
        reasoning: {
          type: "string",
          description: "Your detailed reasoning for why this position won, formatted in markdown with headers, bold text, lists, and quotes for readability"
        }
      },
      required: ["winner", "reasoning"],
      additionalProperties: false
    });

    // Run all 3 judges in parallel with structured output
    const judgePromises = state.judgeModels.map(async (model, index) => {
      const judgeId = `judge-${index + 1}`;
      const judgeName = `Judge ${index + 1}`;

      // Use structured output with enforced JSON schema
      const result = await getStructuredLLMResponse(
        model,
        systemPrompt,
        userPrompt,
        judgmentSchema
      );

      let winner = result.winner?.trim() || 'Unable to determine';
      const reasoning = result.reasoning?.trim() || 'No reasoning provided';

      // Validate winner is one of the actual positions
      if (winner !== 'Unable to determine') {
        const matchedParticipant = state.participants.find(p =>
          p.position.toLowerCase() === winner.toLowerCase()
        );

        if (matchedParticipant) {
          winner = matchedParticipant.position; // Use exact position text
        } else {
          // Try fuzzy matching as fallback
          const normalizedWinner = winner.toLowerCase();
          const fuzzyMatch = state.participants.find(p => {
            const posLower = p.position.toLowerCase();
            return posLower.includes(normalizedWinner) || normalizedWinner.includes(posLower);
          });
          if (fuzzyMatch) {
            winner = fuzzyMatch.position;
          } else {
            console.warn(`[Judge ${index + 1}] Could not match winner "${winner}" to any participant position`);
          }
        }
      }

      // Broadcast completion
      sessionManager.broadcast(this.sessionId, {
        type: 'judge-complete',
        judgeId,
        winner,
        reasoning
      });

      return {
        judgeId,
        judgeName,
        model,
        winner,
        reasoning,
        fullResponse: JSON.stringify(result)
      };
    });

    // Wait for all judges to complete
    const verdicts = await Promise.all(judgePromises);

    // Generate summary of all verdicts
    let judgeSummary: string | undefined;
    try {
      judgeSummary = await this.generateVerdictsSummary(state.topic, verdicts, state.judgeModels[0] || 'google/gemini-2.0-flash-thinking-exp:free');
    } catch (error) {
      console.error('Error generating judge summary:', error);
      judgeSummary = "Unable to generate summary of judge verdicts.";
    }

    // Aggregate votes
    const voteCounts: Record<string, number> = {};
    for (const verdict of verdicts) {
      voteCounts[verdict.winner] = (voteCounts[verdict.winner] || 0) + 1;
    }

    // Find winner (needs 2+ votes)
    const winnerEntry = Object.entries(voteCounts)
      .find(([_, count]) => count >= 2);

    const winner = winnerEntry ? winnerEntry[0] : null;
    const isTie = winner === null;

    const votingResult = {
      winner,
      isTie,
      voteCounts,
      verdicts,
      judgeSummary
    };

    // Update session with voting result
    sessionManager.updateSession(this.sessionId, {
      phase: 'complete',
      votingResult
    });

    // Broadcast results
    sessionManager.broadcast(this.sessionId, {
      type: 'debate-complete',
      votingResult
    });

    sessionManager.broadcast(this.sessionId, {
      type: 'phase-change',
      phase: 'complete'
    });
  }
}
