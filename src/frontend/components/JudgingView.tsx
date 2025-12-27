import React from 'react';
import { Streamdown } from 'streamdown';
import { getColorStyles } from '../utils/colors';

interface Props {
  judgeData: {
    'judge-1'?: { winner: string; reasoning: string };
    'judge-2'?: { winner: string; reasoning: string };
    'judge-3'?: { winner: string; reasoning: string };
  };
  judgeModels: string[];
}

export function JudgingView({ judgeData, judgeModels }: Props) {
  const judgeColors = ['purple', 'indigo', 'blue'] as const;

  return (
    <div className="bg-white rounded-lg shadow-lg h-full flex flex-col relative">
      <div className="border-b border-gray-200 p-6 bg-gray-50/50 flex justify-between items-start gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Judging Phase</h2>
          <p className="text-gray-600 mt-1">
            Three independent judges are evaluating the debate and voting on the winner...
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {(['judge-1', 'judge-2', 'judge-3'] as const).map((judgeId, index) => {
            const styles = getColorStyles(judgeColors[index]);
            const verdict = judgeData[judgeId];
            const modelName = judgeModels[index] || 'Unknown Model';

            return (
              <div key={judgeId} className={`border-l-4 rounded-r-lg p-4 ${styles.container}`}>
                <div className="flex flex-col gap-1 mb-3">
                  <div className="flex items-center gap-2">
                    <strong className="text-gray-900">Judge {index + 1}</strong>
                    {verdict && (
                      <span className={`text-xs font-semibold ml-auto ${styles.text}`}>
                        ✓ Complete
                      </span>
                    )}
                    {!verdict && (
                      <span className="text-xs italic text-gray-400 ml-auto">
                        evaluating...
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 truncate" title={modelName}>
                    {modelName}
                  </span>
                </div>
                {verdict ? (
                  <div className="space-y-3">
                    <div className={`p-2 rounded ${styles.bg}`}>
                      <div className="text-xs font-semibold text-gray-600 mb-1">Voted for:</div>
                      <div className={`text-sm font-bold ${styles.text}`}>
                        {verdict.winner}
                      </div>
                    </div>
                    <div className="text-sm text-gray-700">
                      <div className="text-xs font-semibold text-gray-600 mb-1">Reasoning:</div>
                      <Streamdown>{verdict.reasoning}</Streamdown>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm italic">
                    Waiting for verdict...
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
