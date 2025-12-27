import React, { useState, useEffect } from 'react';
import type { Participant } from '../../shared/types';
import { SearchableSelect } from './SearchableSelect';
import { getColorStyles } from '../utils/colors';

interface Props {
  sessionId: string;
  positions: string[];
  onConfirm: (participants: Participant[], maxRounds: number, customSystemPrompt: string, judgeModels: [string, string, string]) => void;
}

const DEFAULT_MODEL = 'google/gemini-3-flash-preview';

const PARTICIPANT_COLORS = [
  'blue',
  'red',
  'green',
  'purple',
  'orange',
  'pink',
  'cyan',
  'teal',
  'indigo',
  'amber'
];

interface Assignment {
  position: string;
  model: string;
  name: string;
  color: string;
}


const truncate = (str: string, maxLength: number = 50) => {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
};

export function PositionSetup({ sessionId, positions, onConfirm }: Props) {
  const [editablePositions, setEditablePositions] = useState(positions);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    // Auto-assign participants for each position by default
    // Always use the first model (google/gemini-3-flash-preview)
    return positions.map((position, index) => ({
      position,
      model: DEFAULT_MODEL,
      name: `Participant ${index + 1}`,
      color: PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length] || 'blue',
    }));
  });
  const [maxRounds, setMaxRounds] = useState(3);
  const [customSystemPrompt, setCustomSystemPrompt] = useState(
    'You are a skilled debater. Argue your position persuasively, but remain respectful. Respond to others\' points with logic and evidence.'
  );
  const [loading, setLoading] = useState(false);
  const [judgeModels, setJudgeModels] = useState<[string, string, string]>([
    'anthropic/claude-opus-4.5', 
    'google/gemini-3-pro-preview', 
    'deepseek/deepseek-v3.2'
  ]);
  const [useSameJudgeModel, setUseSameJudgeModel] = useState(false);

  useEffect(() => {
    fetch('/api/models')
      .then(res => res.json())
      .then(data => {
        if (data.models && Array.isArray(data.models)) {
          setAvailableModels(data.models);
          // If we have models, we could update assignments to use the first one if the current default isn't in the list?
          // For now, let's just stick with the default or the user selection.
        }
      })
      .catch(err => console.error('Failed to fetch models:', err));
  }, []);

  const handlePositionChange = (index: number, newPosition: string) => {
    const oldPosition = editablePositions[index];
    const updatedPositions = [...editablePositions];
    updatedPositions[index] = newPosition;
    setEditablePositions(updatedPositions);

    // Update all assignments that match the old position to the new one
    setAssignments(prev => prev.map(a => 
      a.position === oldPosition ? { ...a, position: newPosition } : a
    ));
  };

  const handleAddNewPosition = () => {
    setEditablePositions([...editablePositions, '']);
    // Optional: Add a new participant for this new position automatically
    // or let the user add participants manually.
    // Based on previous behavior (auto-assign), let's add one.
    setAssignments(prev => [
      ...prev,
      {
        position: '',
        model: DEFAULT_MODEL,
        name: `Participant ${prev.length + 1}`,
        color: PARTICIPANT_COLORS[prev.length % PARTICIPANT_COLORS.length] || 'blue',
      }
    ]);
  };

  const handleRemovePosition = (index: number) => {
    const positionToRemove = editablePositions[index];
    const newPositions = editablePositions.filter((_, idx) => idx !== index);
    setEditablePositions(newPositions);

    // Remove assignments that were using the removed position
    setAssignments(prev => prev.filter(a => a.position !== positionToRemove));
  };

  const handleAddAssignment = () => {
    setAssignments([
      ...assignments,
      {
        position: editablePositions[0] || '',
        model: DEFAULT_MODEL,
        name: `Participant ${assignments.length + 1}`,
        color: PARTICIPANT_COLORS[assignments.length % PARTICIPANT_COLORS.length] || 'blue',
      },
    ]);
  };

  const handleUpdateAssignment = (
    index: number,
    field: keyof Assignment,
    value: string
  ) => {
    const updated = [...assignments];
    updated[index] = { ...updated[index], [field]: value };
    setAssignments(updated);
  };

  const handleRemoveAssignment = (index: number) => {
    const updated = assignments.filter((_, i) => i !== index);
    setAssignments(updated);
  };

  const handleConfirm = async () => {
    if (assignments.length < 2) {
      alert('Please add at least 2 participants');
      return;
    }

    setLoading(true);
    const participants = assignments.map((a) => ({
      id: crypto.randomUUID(),
      ...a,
    }));

    console.log('[PositionSetup] Confirming with participants:', participants);

    // Update parent state with participants BEFORE sending to backend
    onConfirm(participants, maxRounds, customSystemPrompt, judgeModels);

    try {
      await fetch(`/api/session/${sessionId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participants,
          maxRounds,
          judgeModels,
          customSystemPrompt,
        }),
      });
    } catch (error) {
      console.error('Error starting debate:', error);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg h-full flex flex-col relative">
      <div className="border-b border-gray-200 p-6 bg-gray-50/50 flex justify-between items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configure Debate</h2>
          <p className="text-sm text-gray-600 mt-1">
            Setup positions, models, and rounds
          </p>
        </div>
        <button
          onClick={handleConfirm}
          disabled={assignments.length < 2 || loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold shadow-sm whitespace-nowrap"
        >
          {loading ? 'Starting Debate...' : 'Start Debate'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3">Positions</h3>
          <p className="text-sm text-gray-600 mb-3">
            Edit or add positions for the debate:
          </p>
          <div className="space-y-2">
            {editablePositions.map((pos, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={pos}
                  onChange={(e) => handlePositionChange(i, e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                {editablePositions.length > 2 && (
                  <button
                    onClick={() => handleRemovePosition(i)}
                    className="px-3 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={handleAddNewPosition}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              + Add Position
            </button>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3">Assign Models to Positions</h3>
          <p className="text-sm text-gray-600 mb-3">
            Choose which AI model will argue each position:
          </p>
          <div className="space-y-3">
            {assignments.map((a, i) => (
              <div key={i} className="flex gap-2 items-start p-3 bg-gray-50 rounded">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2 items-center">
                    <div 
                      className={`w-6 h-6 rounded-full flex-shrink-0 ${getColorStyles(a.color).bgSolid}`}
                      title={`Assigned Color: ${a.color}`}
                    />
                    <input
                      placeholder="Participant Name"
                      value={a.name}
                      onChange={(e) => handleUpdateAssignment(i, 'name', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={a.position}
                      onChange={(e) => handleUpdateAssignment(i, 'position', e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      {editablePositions.map((p) => (
                        <option key={p} value={p}>
                          {truncate(p)}
                        </option>
                      ))}
                    </select>
                    <SearchableSelect
                      value={a.model}
                      onChange={(val) => handleUpdateAssignment(i, 'model', val)}
                      options={availableModels.length > 0 ? availableModels : [DEFAULT_MODEL]}
                      className="flex-1"
                      placeholder="Select or type model..."
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveAssignment(i)}
                  className="px-3 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={handleAddAssignment}
              disabled={editablePositions.length === 0}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Add Participant
            </button>
          </div>
        </div>

        <div className="mb-8">
          <label className="flex items-center gap-2">
            <span className="font-semibold">Number of Debate Rounds:</span>
            <input
              type="number"
              min={1}
              max={10}
              value={maxRounds}
              onChange={(e) => setMaxRounds(parseInt(e.target.value) || 1)}
              className="w-20 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <p className="text-sm text-gray-600 mt-1">
            Each participant will speak once per round
          </p>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3">Debate Judges</h3>
          <p className="text-sm text-gray-600 mb-3">
            Three judges will independently evaluate the debate and vote on the winner
          </p>

          <div className="mb-4 inline-block">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useSameJudgeModel}
                onChange={(e) => {
                  setUseSameJudgeModel(e.target.checked);
                  if (e.target.checked) {
                    // When enabling, set all judges to the first judge's model
                    setJudgeModels([judgeModels[0], judgeModels[0], judgeModels[0]]);
                  }
                }}
                className="w-4 h-4"
              />
              <span className="text-sm">Use same model for all judges</span>
            </label>
          </div>

          <div className="space-y-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                  <span className="font-medium text-sm w-24">Judge {index + 1}:</span>
                  <SearchableSelect
                    value={judgeModels[index]}
                    onChange={(val) => {
                      const newModels: [string, string, string] = [...judgeModels] as [string, string, string];
                      newModels[index] = val;
                      if (useSameJudgeModel) {
                        // If using same model, update all judges
                        setJudgeModels([val, val, val]);
                      } else {
                        setJudgeModels(newModels);
                      }
                    }}
                    options={availableModels.length > 0 ? availableModels : [DEFAULT_MODEL]}
                    placeholder="Select judge model..."
                    className="flex-1"
                  />
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <label className="flex flex-col gap-2">
            <span className="font-semibold">Participant System Prompt:</span>
            <textarea
              value={customSystemPrompt}
              onChange={(e) => setCustomSystemPrompt(e.target.value)}
              className="w-full h-32 p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Enter instructions for all participants..."
            />
          </label>
          <p className="text-sm text-gray-600 mt-1">
            This prompt will be given to all participating models to guide their behavior and persona
          </p>
        </div>
      </div>
    </div>
  );
}
