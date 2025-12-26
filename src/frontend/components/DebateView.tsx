import React, { useRef, useEffect } from 'react';
import { Streamdown } from 'streamdown';
import { MessageStream } from './MessageStream';
import { getColorStyles } from '../utils/colors';
import type { DebateState } from '../../shared/types';

interface Props {
  state: DebateState;
  streamingMessages: Map<string, string>;
}

export function DebateView({ state, streamingMessages }: Props) {
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
    <div className="bg-white rounded-lg shadow-lg h-[80vh] flex flex-col relative">
      <div className="border-b border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900">{state.topic}</h2>
        <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
          <span>
            Phase: {state.phase === 'opening-statements' ? 'Opening Statements' : 'Debate'}
          </span>
          {state.phase === 'debate' && (
            <span>
              Round {state.roundNumber} of {state.maxRounds}
            </span>
          )}
          <span>{state.participants.length} Participants</span>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-6 space-y-4"
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
                <div className="relative py-6">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-sm font-semibold text-gray-500">Debate Rounds Begin</span>
                  </div>
                </div>
              )}
              <div
                className={`border-l-4 rounded-r-lg p-4 ${getColorStyles(participant.color).container}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <strong className="text-gray-900">{participant.name}</strong>
                  <span className="text-sm text-gray-600">{participant.position}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {participant.model}
                  </span>
                </div>
                <div className="text-gray-700 prose prose-sm max-w-none">
                  <Streamdown>{msg.content}</Streamdown>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* Show currently streaming message */}
        {streamingParticipantId && streamingParticipant && (
          <MessageStream
            participantId={streamingParticipantId}
            participant={streamingParticipant}
            content={streamContent}
          />
        )}

        {displayMessages.length === 0 && !streamingParticipantId && (
          <div className="text-center text-gray-500 py-12">
            Waiting for debate to begin...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
