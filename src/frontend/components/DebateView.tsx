import React, { useRef, useEffect } from 'react';
import { ChatBubble } from './ChatBubble';
import type { DebateState } from '../../shared/types';

interface Props {
  state: DebateState;
  streamingMessages: Map<string, string>;
  onNext?: () => void;
  nextLabel?: string;
  statusMessage?: string;
}

export function DebateView({ state, streamingMessages, onNext, nextLabel, statusMessage }: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom only when entering the debate phase
  useEffect(() => {
    if (state.phase === 'debate') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.phase]);

  // Filter messages for current phase (opening statements or debate)
  const displayMessages = state.messages.filter(
    (m) => m.phase === 'opening-statements' || m.phase === 'debate'
  );

  console.log('[DebateView] Rendering - Phase:', state.phase, 'Total messages:', state.messages.length, 'Display messages:', displayMessages.length, 'Streaming participants:', Array.from(streamingMessages.keys()));

  // Get currently streaming participant
  const streamingParticipantId = Array.from(streamingMessages.keys())[0];
  const streamingParticipant = state.participants.find(
    (p) => p.id === streamingParticipantId
  );
  const streamContent = streamingParticipantId
    ? streamingMessages.get(streamingParticipantId) || ''
    : '';

  return (
    <div className="bg-white rounded-lg shadow-lg h-full flex flex-col relative">
      <div className="border-b border-gray-200 p-6 bg-gray-50/50 flex justify-between items-start gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{state.topic}</h2>
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
            <span className="px-2.5 py-0.5 rounded-full bg-gray-100 border border-gray-200 font-medium">
              Phase: {state.phase === 'opening-statements' ? 'Opening Statements' : 'Debate'}
            </span>
            {state.phase === 'debate' && (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-medium">
                Round {state.roundNumber} of {state.maxRounds}
              </span>
            )}
            <span className="text-gray-500">{state.participants.length} Participants</span>
          </div>
        </div>

        {onNext && (
          <div className="flex flex-col items-end gap-2">
            {statusMessage && (
              <span className="text-sm font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                {statusMessage}
              </span>
            )}
            <button
              onClick={onNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-sm whitespace-nowrap"
            >
              {nextLabel || 'Next'}
            </button>
          </div>
        )}
      </div>

      <div
        className="flex-1 overflow-y-auto p-6 space-y-6"
      >
        {displayMessages.map((msg, index) => {
          const participant = state.participants.find((p) => p.id === msg.participantId);
          if (!participant) return null;

          const showDivider = index > 0 && 
            displayMessages[index - 1]?.phase === 'opening-statements' && 
            msg.phase === 'debate';

          return (
            <React.Fragment key={msg.id}>
              {showDivider && (
                <div className="relative py-8">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Debate Rounds Begin</span>
                  </div>
                </div>
              )}
              <ChatBubble participant={participant} content={msg.content} />
            </React.Fragment>
          );
        })}

        {/* Show currently streaming message */}
        {streamingParticipantId && streamingParticipant && streamContent && (
          <ChatBubble
            participant={streamingParticipant}
            content={streamContent}
            isStreaming={true}
          />
        )}

        {displayMessages.length === 0 && !streamingParticipantId && (
          <div className="flex flex-col items-center justify-center text-gray-400 py-20 h-full">
            <div className="text-4xl mb-4">💬</div>
            <p>Waiting for debate to begin...</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
