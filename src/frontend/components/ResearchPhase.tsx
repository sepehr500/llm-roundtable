import React from 'react';
import { Streamdown } from 'streamdown';
import { getColorStyles } from '../utils/colors';
import type { Participant, Message } from '../../shared/types';

interface Props {
  participants: Participant[];
  messages: Message[];
  streamingMessages: Map<string, string>;
}

export function ResearchPhase({ participants, messages, streamingMessages }: Props) {
  const researchMessages = messages.filter((m) => m.messageType === 'research');

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-bold mb-4">Research Phase</h2>
      <p className="text-gray-600 mb-6">
        Each participant is researching and preparing their arguments...
      </p>

      <div className="space-y-4">
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
