import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Streamdown } from 'streamdown';
import { useWebSocket } from './hooks/useWebSocket';
import { useDebateState } from './hooks/useDebateState';
import { PhaseIndicator } from './components/PhaseIndicator';
import { TopicProposal } from './components/TopicProposal';
import { PositionSetup } from './components/PositionSetup';
import { PhaseConfirmation } from './components/PhaseConfirmation';
import { ResearchPhase } from './components/ResearchPhase';
import { DebateView } from './components/DebateView';
import { JudgingView } from './components/JudgingView';
import './styles.css';

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { state, streamingMessages, updateState, setState } = useDebateState();
  const { connected } = useWebSocket(sessionId, updateState);

  useEffect(() => {
    // Create session on mount
    fetch('/api/session', { method: 'POST' })
      .then((r) => r.json())
      .then((data) => {
        setSessionId(data.sessionId);
        setState((s) => ({ ...s, sessionId: data.sessionId }));
      })
      .catch((error) => console.error('Error creating session:', error));
  }, []);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing session...</p>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to server...</p>
        </div>
      </div>
    );
  }

  // Get streaming content for judge
  const judgeStreamContent = streamingMessages.get('judge') || '';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm mb-6">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            LLM Roundtable
          </h1>
          <PhaseIndicator phase={state.phase} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pb-8">
        {state.phase === 'topic-proposal' && <TopicProposal sessionId={sessionId} />}

        {state.phase === 'position-generation' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Generating debate positions...</p>
            <p className="text-sm text-gray-500 mt-2">
              Using AI to identify diverse viewpoints on this topic
            </p>
          </div>
        )}

        {state.phase === 'position-confirmation' && (
          <PositionSetup
            sessionId={sessionId}
            positions={state.suggestedPositions}
            onConfirm={(participants, maxRounds, customSystemPrompt) => {
              console.log('[App] Setting participants, maxRounds, and customSystemPrompt in state:', participants.length, maxRounds);
              setState(s => ({ ...s, participants, maxRounds, customSystemPrompt }));
            }}
          />
        )}

        {state.phase === 'research-ready' && (
          <PhaseConfirmation
            sessionId={sessionId}
            title="Ready to Begin Research"
            description="The participants will now research and prepare their arguments. Click below to start the research phase."
            nextPhase="research"
            endpoint="start-research"
            buttonText="Start Research Phase"
          />
        )}

        {state.phase === 'research' && (
          <ResearchPhase
            participants={state.participants}
            messages={state.messages}
            streamingMessages={streamingMessages}
          />
        )}

        {state.phase === 'opening-ready' && (
          <>
            <ResearchPhase
              participants={state.participants}
              messages={state.messages}
              streamingMessages={streamingMessages}
            />
            <div className="mt-6 bg-white rounded-lg shadow-lg p-6 text-center">
              <h3 className="text-lg font-semibold mb-2">Research Complete!</h3>
              <p className="text-gray-600 mb-4">
                All participants have finished their research. Ready to begin opening statements?
              </p>
              <button
                onClick={async () => {
                  try {
                    await fetch(`/api/session/${sessionId}/start-opening`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                    });
                  } catch (error) {
                    console.error('Error starting opening statements:', error);
                  }
                }}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Start Opening Statements →
              </button>
            </div>
          </>
        )}

        {(state.phase === 'opening-statements' || state.phase === 'debate') && (
          <DebateView state={state} streamingMessages={streamingMessages} />
        )}

        {state.phase === 'debate-ready' && (
          <>
            <DebateView state={state} streamingMessages={streamingMessages} />
            <div className="mt-6 bg-white rounded-lg shadow-lg p-6 text-center">
              <h3 className="text-lg font-semibold mb-2">Opening Statements Complete!</h3>
              <p className="text-gray-600 mb-4">
                All participants have delivered their opening statements. Ready to begin debate rounds?
              </p>
              <button
                onClick={async () => {
                  try {
                    await fetch(`/api/session/${sessionId}/start-debate`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                    });
                  } catch (error) {
                    console.error('Error starting debate:', error);
                  }
                }}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Start Debate Rounds →
              </button>
            </div>
          </>
        )}

        {state.phase === 'judging-ready' && (
          <>
            <DebateView state={state} streamingMessages={streamingMessages} />
            <div className="mt-6 bg-white rounded-lg shadow-lg p-6 text-center">
              <h3 className="text-lg font-semibold mb-2">Debate Complete!</h3>
              <p className="text-gray-600 mb-4">
                All debate rounds are finished. Ready to hear the judge's verdict?
              </p>
              <button
                onClick={async () => {
                  try {
                    await fetch(`/api/session/${sessionId}/start-judging`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                    });
                  } catch (error) {
                    console.error('Error starting judging:', error);
                  }
                }}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Start Judging →
              </button>
            </div>
          </>
        )}

        {state.phase === 'judging' && (
          <JudgingView streamingContent={judgeStreamContent} />
        )}

        {state.phase === 'complete' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6 text-center">
              Debate Complete!
            </h2>

            <div className="mb-8 p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
              <div className="text-sm text-blue-600 font-semibold mb-2">
                WINNER
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {state.winner}
              </div>
            </div>

            {state.judgeReasoning && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-3">Judge's Reasoning</h3>
                <div className="p-4 bg-gray-50 rounded-lg text-gray-700 prose prose-sm max-w-none">
                  <Streamdown>{state.judgeReasoning}</Streamdown>
                </div>
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Debate Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-gray-50 rounded">
                  <div className="text-gray-600">Topic</div>
                  <div className="font-semibold">{state.topic}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <div className="text-gray-600">Rounds</div>
                  <div className="font-semibold">{state.maxRounds}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <div className="text-gray-600">Participants</div>
                  <div className="font-semibold">{state.participants.length}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <div className="text-gray-600">Total Messages</div>
                  <div className="font-semibold">{state.messages.length}</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Participants</h3>
              <div className="space-y-2">
                {state.participants.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-gray-50 rounded flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-sm text-gray-600">{p.position}</div>
                    </div>
                    <div className="text-xs text-gray-500">{p.model}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start New Debate
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Mount the app
const root = createRoot(document.getElementById('root')!);
root.render(<App />);
