import React from 'react';
import { Streamdown } from 'streamdown';
import type { Participant } from '../../shared/types';

interface Props {
  participantId: string;
  participant: Participant | undefined;
  content: string;
}


const getColorStyles = (color: string = 'blue') => {
  const styles: Record<string, { container: string, text: string, cursor: string }> = {
    blue: { container: 'border-blue-500 bg-blue-50', text: 'text-blue-600', cursor: 'bg-blue-600' },
    red: { container: 'border-red-500 bg-red-50', text: 'text-red-600', cursor: 'bg-red-600' },
    green: { container: 'border-green-500 bg-green-50', text: 'text-green-600', cursor: 'bg-green-600' },
    purple: { container: 'border-purple-500 bg-purple-50', text: 'text-purple-600', cursor: 'bg-purple-600' },
    orange: { container: 'border-orange-500 bg-orange-50', text: 'text-orange-600', cursor: 'bg-orange-600' },
    pink: { container: 'border-pink-500 bg-pink-50', text: 'text-pink-600', cursor: 'bg-pink-600' },
    cyan: { container: 'border-cyan-500 bg-cyan-50', text: 'text-cyan-600', cursor: 'bg-cyan-600' },
    teal: { container: 'border-teal-500 bg-teal-50', text: 'text-teal-600', cursor: 'bg-teal-600' },
    indigo: { container: 'border-indigo-500 bg-indigo-50', text: 'text-indigo-600', cursor: 'bg-indigo-600' },
    amber: { container: 'border-amber-500 bg-amber-50', text: 'text-amber-600', cursor: 'bg-amber-600' },
  };
  return styles[color] || styles.blue!;
};

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
