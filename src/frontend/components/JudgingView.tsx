import React from 'react';
import { Streamdown } from 'streamdown';

interface Props {
  streamingContent: string;
}

export function JudgingView({ streamingContent }: Props) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-bold mb-4">Judging Phase</h2>
      <p className="text-gray-600 mb-6">
        A neutral judge is evaluating the debate and determining the winner...
      </p>

      {streamingContent && (
        <div className="border-l-4 border-purple-500 bg-purple-50 rounded-r-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <strong className="text-gray-900">Judge</strong>
            <span className="text-xs text-purple-600 italic ml-auto">
              analyzing...
            </span>
          </div>
          <div className="text-gray-700 prose prose-sm max-w-none">
            <Streamdown mode="streaming">{streamingContent}</Streamdown>
            <span className="inline-block w-2 h-4 bg-purple-600 ml-1 animate-pulse"></span>
          </div>
        </div>
      )}
    </div>
  );
}
