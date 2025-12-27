import React from 'react';
import { Streamdown } from 'streamdown';
import { getColorStyles } from '../utils/colors';

interface Props {
  judgeStreams: {
    'judge-1': string;
    'judge-2': string;
    'judge-3': string;
  };
  judgeModels: string[];
}

export function JudgingView({ judgeStreams, judgeModels }: Props) {
  const judgeColors = ['purple', 'indigo', 'blue'] as const;

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-bold mb-4">Judging Phase</h2>
      <p className="text-gray-600 mb-6">
        Three independent judges are evaluating the debate and voting on the winner...
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(['judge-1', 'judge-2', 'judge-3'] as const).map((judgeId, index) => {
          const styles = getColorStyles(judgeColors[index]);
          const streamingContent = judgeStreams[judgeId] || '';
          const modelName = judgeModels[index] || 'Unknown Model';

          return (
            <div key={judgeId} className={`border-l-4 rounded-r-lg p-4 ${styles.container}`}>
              <div className="flex flex-col gap-1 mb-3">
                <div className="flex items-center gap-2">
                  <strong className="text-gray-900">Judge {index + 1}</strong>
                  {streamingContent && (
                    <span className={`text-xs italic ml-auto ${styles.text}`}>
                      analyzing...
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500 truncate" title={modelName}>
                  {modelName}
                </span>
              </div>
              {streamingContent ? (
                <div className="text-gray-700 prose prose-sm max-w-none text-sm">
                  <Streamdown mode="streaming">{streamingContent}</Streamdown>
                  <span className={`inline-block w-2 h-4 ml-1 animate-pulse ${styles.cursor}`}></span>
                </div>
              ) : (
                <div className="text-gray-400 text-sm italic">
                  Waiting for judge to start...
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
