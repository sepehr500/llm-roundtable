import React from 'react';
import type { DebatePhase } from '../../shared/types';

interface Props {
  phase: DebatePhase;
}

const PHASES = [
  { id: 'topic-proposal', label: 'Topic' },
  { id: 'position-generation', label: 'Positions' },
  { id: 'position-confirmation', label: 'Setup' },
  { id: 'research', label: 'Research', readyPhase: 'research-ready' },
  { id: 'opening-statements', label: 'Opening', readyPhase: 'opening-ready' },
  { id: 'debate', label: 'Debate', readyPhase: 'debate-ready' },
  { id: 'judging', label: 'Judging', readyPhase: 'judging-ready' },
  { id: 'complete', label: 'Complete' },
];

export function PhaseIndicator({ phase }: Props) {
  // Map "ready" phases to their corresponding main phases for display
  const displayPhase = phase.endsWith('-ready')
    ? phase.replace('-ready', '')
    : phase;

  const currentIndex = PHASES.findIndex((p) => p.id === displayPhase || p.readyPhase === phase);

  return (
    <div className="flex items-center gap-2">
      {PHASES.map((p, index) => (
        <React.Fragment key={p.id}>
          <div
            className={`
              px-3 py-1 rounded text-sm font-medium transition-colors
              ${
                index < currentIndex
                  ? 'bg-green-100 text-green-700'
                  : index === currentIndex
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-400'
              }
            `}
          >
            {p.label}
          </div>
          {index < PHASES.length - 1 && (
            <div className="text-gray-400">→</div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
