import { useState, useCallback } from 'react';
import type { DebateState, Message, DebatePhase } from '../../shared/types.ts';

/**
 * Hook to manage debate state and handle WebSocket updates
 */
export function useDebateState() {
  const [state, setState] = useState<DebateState>({
    sessionId: '',
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
  });

  const [streamingMessages, setStreamingMessages] = useState<Map<string, string>>(
    new Map()
  );

  const updateState = useCallback((wsMessage: any) => {
    console.log('[useDebateState] Received message:', wsMessage.type, wsMessage);

    switch (wsMessage.type) {
      case 'phase-change':
        console.log('[useDebateState] Phase change to:', wsMessage.phase);
        setState((s) => ({ ...s, phase: wsMessage.phase as DebatePhase }));
        break;

      case 'positions-generated':
        console.log('[useDebateState] Positions generated:', wsMessage.positions, 'topic:', wsMessage.topic);
        setState((s) => ({
          ...s,
          topic: wsMessage.topic,
          suggestedPositions: wsMessage.positions,
          phase: 'position-confirmation',
        }));
        break;

      case 'turn-change':
        console.log('[useDebateState] Turn change to participant:', wsMessage.participantId);
        setStreamingMessages(new Map([[wsMessage.participantId, '']]));
        break;

      case 'stream-chunk':
        setStreamingMessages((prev) => {
          const updated = new Map(prev);
          const current = updated.get(wsMessage.participantId) || '';
          updated.set(wsMessage.participantId, current + wsMessage.chunk);
          console.log('[useDebateState] Stream chunk for', wsMessage.participantId, 'total length:', current.length + wsMessage.chunk.length);
          return updated;
        });
        break;

      case 'stream-complete': {
        console.log('[useDebateState] Stream complete for:', wsMessage.participantId);
        // Use setStreamingMessages callback to get current value, then clear it
        setStreamingMessages((prev) => {
          const finalContent = prev.get(wsMessage.participantId) || '';
          console.log('[useDebateState] Final content length:', finalContent.length, 'participantId:', wsMessage.participantId, 'isJudge:', wsMessage.participantId === 'judge');

          // Only add to messages if there's content and it's not the judge
          if (finalContent && wsMessage.participantId !== 'judge') {
            console.log('[useDebateState] Adding message to state');
            setState((s) => {
              const newMessage: Message = {
                id: crypto.randomUUID(),
                participantId: wsMessage.participantId,
                content: finalContent,
                timestamp: Date.now(),
                phase: s.phase, // Use phase from current state
                messageType: wsMessage.messageType || 'statement',
              };

              console.log('[useDebateState] New message:', newMessage, 'Current messages count:', s.messages.length, 'New count:', s.messages.length + 1);

              return {
                ...s,
                messages: [...s.messages, newMessage],
              };
            });
          } else {
            console.log('[useDebateState] NOT adding message - content:', !!finalContent, 'isJudge:', wsMessage.participantId === 'judge');
          }

          // Remove from streaming messages
          const updated = new Map(prev);
          updated.delete(wsMessage.participantId);
          return updated;
        });
        break;
      }

      case 'debate-complete':
        console.log('[useDebateState] Debate complete, winner:', wsMessage.winner);
        setState((s) => ({
          ...s,
          winner: wsMessage.winner,
          judgeReasoning: wsMessage.judgeReasoning,
        }));
        break;

      case 'error':
        console.error('WebSocket error:', wsMessage.message);
        break;

      default:
        console.log('[useDebateState] Unknown message type:', wsMessage.type);
    }
  }, []); // Empty dependency array since we use callback form everywhere

  return { state, streamingMessages, updateState, setState };
}
