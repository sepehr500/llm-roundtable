import React from 'react';
import { Streamdown } from 'streamdown';
import { getColorStyles } from '../utils/colors';
import type { Participant } from '../../shared/types';

interface ChatBubbleProps {
  participant: Participant;
  content: string;
  isStreaming?: boolean;
}

export function ChatBubble({ participant, content, isStreaming = false }: ChatBubbleProps) {
  const styles = getColorStyles(participant.color);

  return (
    <div className="flex gap-4">
      <div 
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md mt-1 ring-2 ring-white ${styles.bgSolid}`}
        title={participant.name}
      >
        {participant.name.substring(0, 1).toUpperCase()}
      </div>

      <div className={`flex-1 min-w-0 rounded-2xl rounded-tl-none p-5 shadow-sm transition-all duration-200 ${styles.bg}`}>
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-black/5">
          <strong className={`text-sm tracking-tight ${styles.text}`}>
            {participant.name}
          </strong>
          
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/60 text-gray-700 border border-black/5 shadow-sm">
            {participant.position}
          </span>
          
          <div className="ml-auto flex items-center gap-2">
            {!isStreaming && (
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold opacity-70">
                {participant.model}
              </span>
            )}
            
            {isStreaming && (
              <div className={`text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1 ${styles.text}`}>
                <span>Generating</span>
                <div className="flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-current animate-bounce"></span>
                  <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '100ms' }}></span>
                  <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '200ms' }}></span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-gray-800 prose prose-sm max-w-none prose-p:leading-relaxed prose-headings:font-semibold prose-a:text-blue-600 prose-strong:text-gray-900">
          {isStreaming ? (
            <>
              <Streamdown mode="streaming">{content}</Streamdown>
              <span className={`inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse ${styles.cursor}`}></span>
            </>
          ) : (
            <Streamdown>{content}</Streamdown>
          )}
        </div>
      </div>
    </div>
  );
}
