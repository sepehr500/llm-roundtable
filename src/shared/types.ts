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
  judgeModel?: string;           // Model used for judging
  winner?: string;
  judgeReasoning?: string;
}

// WebSocket Message Protocol
export type WSMessage =
  | { type: 'connect', sessionId: string }
  | { type: 'stream-chunk', participantId: string, chunk: string }
  | { type: 'stream-complete', participantId: string, messageType?: string }
  | { type: 'phase-change', phase: DebatePhase }
  | { type: 'turn-change', participantId: string }
  | { type: 'positions-generated', positions: string[], topic: string }
  | { type: 'debate-complete', winner: string, judgeReasoning: string }
  | { type: 'error', message: string };
