import React from 'react';
import { Streamdown } from 'streamdown';
import { getColorStyles } from '../utils/colors';
import type { Participant } from '../../shared/types';

interface Props {
  participantId: string;
  participant: Participant | undefined;
  content: string;
}

export function MessageStream({ participantId, participant, content }: Props) {

  if (!content || !participant) return null;

  const styles = getColorStyles(participant.color || 'blue');

  return (
    <div className={`border-l-4 rounded-r-lg p-4 ${styles.container}`}>
      <div className="flex items-center gap-3 mb-2">
        <strong className="text-gray-900">{participant.name}</strong>
        <span className="text-sm text-gray-600">{participant.position}</span>
        <div className={`text-xs italic ml-auto flex items-center gap-0.5 ${styles.text}`}>
          <span>typing</span>
          <span className="animate-bounce">.</span>
          <span className="animate-bounce" style={{ animationDelay: '100ms' }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: '200ms' }}>.</span>
        </div>
      </div>
      <div className="text-gray-700 prose prose-sm max-w-none">
        <Streamdown mode="streaming">{content}</Streamdown>
        <span className={`inline-block w-2 h-4 ml-1 animate-pulse ${styles.cursor}`}></span>
      </div>
    </div>
  );
}
