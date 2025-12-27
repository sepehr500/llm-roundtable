import React from 'react';
import { Streamdown } from 'streamdown';
import { getColorStyles } from '../utils/colors';
import type { Participant, Message } from '../../shared/types';

interface Props {
  participants: Participant[];
  messages: Message[];
  streamingMessages: Map<string, string>;
  onNext?: () => void;
  nextLabel?: string;
  statusMessage?: string;
}

export function ResearchPhase({ participants, messages, streamingMessages, onNext, nextLabel, statusMessage }: Props) {
  const researchMessages = messages.filter((m) => m.messageType === 'research');

  return (
    <div className="bg-white rounded-lg shadow-lg h-full flex flex-col relative">
      <div className="border-b border-gray-200 p-6 bg-gray-50/50 flex justify-between items-start gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Research Phase</h2>
          <p className="text-gray-600 mt-1">
            Each participant is researching and preparing their arguments...
          </p>
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

      <div className="flex-1 overflow-y-auto p-8 space-y-4">
        {participants.map((participant) => {
          const participantMessage = researchMessages.find(
            (m) => m.participantId === participant.id
          );
          const isStreaming = streamingMessages.has(participant.id);
          const streamContent = streamingMessages.get(participant.id) || '';
          const colorStyles = getColorStyles(participant.color);

          return (
            <div
              key={participant.id}
              className={`border-l-4 p-4 rounded-r-lg ${
                participantMessage || isStreaming
                  ? colorStyles.container
                  : 'border-gray-300 bg-gray-50'
              } ${isStreaming ? 'animate-pulse' : ''}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <strong className="text-gray-900">{participant.name}</strong>
                <span className="text-sm text-gray-600">{participant.position}</span>
                {isStreaming && (
                  <span className={`text-xs italic ml-auto ${colorStyles.text}`}>
                    researching...
                  </span>
                )}
                {participantMessage && (
                  <span className={`text-xs ${colorStyles.text} ml-auto`}>✓ Complete</span>
                )}
              </div>
              {(participantMessage || isStreaming) && (
                <div className="text-gray-700 text-sm prose prose-sm max-w-none">
                  <Streamdown mode={isStreaming ? "streaming" : "static"}>
                    {participantMessage?.content || streamContent}
                  </Streamdown>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
