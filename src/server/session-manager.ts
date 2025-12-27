import type { DebateState, WSMessage } from '../shared/types.ts';
import type { ServerWebSocket } from 'bun';

/**
 * Manages in-memory session state and WebSocket connections
 */
class SessionManager {
  private sessions = new Map<string, DebateState>();
  private wsConnections = new Map<string, ServerWebSocket<{ sessionId: string }>[]>();

  /**
   * Create a new debate session
   * @returns sessionId
   */
  createSession(): string {
    const sessionId = crypto.randomUUID();

    this.sessions.set(sessionId, {
      sessionId,
      phase: 'topic-proposal',
      topic: '',
      suggestedPositions: [],
      confirmedPositions: [],
      participants: [],
      messages: [],
      currentTurn: 0,
      roundNumber: 1,
      maxRounds: 3,
      researchComplete: new Set(),
      judgeModels: ['google/gemini-2.0-flash-exp:free', 'google/gemini-2.0-flash-exp:free', 'google/gemini-2.0-flash-exp:free'], // Default judge models
    });

    return sessionId;
  }

  /**
   * Get session state by ID
   */
  getSession(sessionId: string): DebateState | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Update session state
   */
  updateSession(sessionId: string, updates: Partial<DebateState>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
    }
  }

  /**
   * Add a WebSocket connection to a session
   */
  addWebSocket(sessionId: string, ws: ServerWebSocket<{ sessionId: string }>): void {
    const connections = this.wsConnections.get(sessionId) || [];
    connections.push(ws);
    this.wsConnections.set(sessionId, connections);
  }

  /**
   * Remove a WebSocket connection from a session
   */
  removeWebSocket(sessionId: string, ws: ServerWebSocket<{ sessionId: string }>): void {
    const connections = this.wsConnections.get(sessionId) || [];
    const index = connections.indexOf(ws);
    if (index > -1) {
      connections.splice(index, 1);
    }
  }

  /**
   * Broadcast a message to all WebSocket connections in a session
   */
  broadcast(sessionId: string, message: WSMessage): void {
    const connections = this.wsConnections.get(sessionId) || [];
    const messageStr = JSON.stringify(message);

    connections.forEach(ws => {
      try {
        ws.send(messageStr);
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    });
  }

  /**
   * Get all session IDs (for debugging)
   */
  getAllSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
