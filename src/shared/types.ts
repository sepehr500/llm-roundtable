// Debate Phase Types
export type DebatePhase =
  | 'topic-proposal'
  | 'position-generation'
  | 'position-confirmation'
  | 'research-ready'
  | 'research'
  | 'opening-ready'
  | 'opening-statements'
  | 'debate-ready'
  | 'debate'
  | 'judging-ready'
  | 'judging'
  | 'complete';

// Participant in the debate
export interface Participant {
  id: string;
  model: string;        // e.g., "openai/gpt-4-turbo"
  position: string;     // The position they're arguing
  name: string;         // Display name
  color: string;        // Tailwind color key (e.g., 'blue', 'red')
}

// Message in the debate
export interface Message {
  id: string;
  participantId: string;
  content: string;
  timestamp: number;
  phase: DebatePhase;
  messageType: 'statement' | 'question' | 'response' | 'research' | 'judgment';
}

// Individual judge verdict
export interface JudgeVerdict {
  judgeId: string;         // e.g., 'judge-1', 'judge-2', 'judge-3'
  judgeName: string;       // Display name
  model: string;           // AI model used
  winner: string;          // Position this judge voted for
  reasoning: string;       // Extracted reasoning
  fullResponse: string;    // Complete response
}

// Voting result with all verdicts
export interface VotingResult {
  winner: string | null;   // Winning position or null if tie
  isTie: boolean;
  voteCounts: Record<string, number>;  // Position -> vote count
  verdicts: JudgeVerdict[];
  judgeSummary?: string;   // AI-generated summary of all verdicts
}

// Complete debate session state
export interface DebateState {
  sessionId: string;
  phase: DebatePhase;
  topic: string;
  suggestedPositions: string[];
  confirmedPositions: string[];
  participants: Participant[];
  messages: Message[];
  currentTurn: number;        // Index into participants array
  roundNumber: number;
  maxRounds: number;
  researchComplete: Set<string>; // Participant IDs who finished research
  judgeModels: string[];         // Array of 3 judge models
  customSystemPrompt?: string;   // Optional custom system prompt for participants
  votingResult?: VotingResult;   // Complete voting result with all verdicts
}

// WebSocket Message Protocol
export type WSMessage =
  | { type: 'connect', sessionId: string }
  | { type: 'stream-chunk', participantId: string, chunk: string }
  | { type: 'stream-complete', participantId: string, messageType?: string }
  | { type: 'phase-change', phase: DebatePhase }
  | { type: 'turn-change', participantId: string }
  | { type: 'positions-generated', positions: string[], topic: string }
  | { type: 'judge-complete', judgeId: string, winner: string, reasoning: string }
  | { type: 'debate-complete', votingResult: VotingResult }
  | { type: 'error', message: string };
