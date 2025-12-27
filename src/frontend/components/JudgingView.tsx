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
                      <span className={`flex items-center gap-2 text-xs font-medium ml-auto ${styles.bgSolid} text-white px-2 py-1 rounded-full opacity-90`}>
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Deliberating...
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
                  <div className="space-y-4 pt-2">
                    <div className="animate-pulse flex space-x-4">
                      <div className="flex-1 space-y-3 py-1">
                        <div className="h-12 bg-gray-200 rounded opacity-50"></div>
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-200 rounded w-3/4 opacity-50"></div>
                          <div className="h-3 bg-gray-200 rounded w-5/6 opacity-50"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2 opacity-50"></div>
                        </div>
                      </div>
                    </div>
                    <div className="text-center text-xs text-gray-400 italic">
                       Reviewing transcript and weighing arguments...
                    </div>
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
