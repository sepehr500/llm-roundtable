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
  const { state, streamingMessages, judgeVerdicts, updateState, setState } = useDebateState();
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

  // Get verdict data for all 3 judges
  const judgeData = {
    'judge-1': judgeVerdicts.get('judge-1'),
    'judge-2': judgeVerdicts.get('judge-2'),
    'judge-3': judgeVerdicts.get('judge-3'),
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <header className="bg-white shadow-sm shrink-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            LLM Roundtable
          </h1>
          <PhaseIndicator phase={state.phase} />
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 pb-4 min-h-0 flex flex-col overflow-y-auto">
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
            onConfirm={(participants, maxRounds, customSystemPrompt, judgeModels) => {
              console.log('[App] Setting participants, maxRounds, customSystemPrompt, and judgeModels in state:', participants.length, maxRounds, judgeModels);
              setState(s => ({ ...s, participants, maxRounds, customSystemPrompt, judgeModels }));
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

        {(state.phase === 'research' || state.phase === 'opening-ready') && (
          <ResearchPhase
            participants={state.participants}
            messages={state.messages}
            streamingMessages={streamingMessages}
            statusMessage={state.phase === 'opening-ready' ? "Research Complete!" : undefined}
            nextLabel={state.phase === 'opening-ready' ? "Start Opening Statements →" : undefined}
            onNext={state.phase === 'opening-ready' ? async () => {
              try {
                await fetch(`/api/session/${sessionId}/start-opening`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                });
              } catch (error) {
                console.error('Error starting opening statements:', error);
              }
            } : undefined}
          />
        )}

        {(state.phase === 'opening-statements' || state.phase === 'debate' || state.phase === 'debate-ready' || state.phase === 'judging-ready') && (
          <DebateView 
            state={state} 
            streamingMessages={streamingMessages} 
            statusMessage={
              state.phase === 'debate-ready' ? "Opening Statements Complete!" :
              state.phase === 'judging-ready' ? "Debate Rounds Complete!" :
              undefined
            }
            nextLabel={
              state.phase === 'debate-ready' ? "Start Debate Rounds →" :
              state.phase === 'judging-ready' ? "Start Judging →" :
              undefined
            }
            onNext={
              state.phase === 'debate-ready' ? async () => {
                try {
                  await fetch(`/api/session/${sessionId}/start-debate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                  });
                } catch (error) {
                  console.error('Error starting debate:', error);
                }
              } :
              state.phase === 'judging-ready' ? async () => {
                try {
                  await fetch(`/api/session/${sessionId}/start-judging`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                  });
                } catch (error) {
                  console.error('Error starting judging:', error);
                }
              } : undefined
            }
          />
        )}

        {state.phase === 'judging' && (
          <JudgingView
            judgeData={judgeData}
            judgeModels={state.judgeModels || ['google/gemini-3-flash-preview', 'google/gemini-3-flash-preview', 'google/gemini-3-flash-preview']}
          />
        )}

        {state.phase === 'complete' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6 text-center">
              Debate Complete!
            </h2>

            {state.votingResult && (
              <>
                <div className={`mb-6 p-6 rounded-lg border-2 ${state.votingResult.isTie ? 'bg-gray-50 border-gray-300' : 'bg-blue-50 border-blue-200'}`}>
                  <div className={`text-sm font-semibold mb-2 ${state.votingResult.isTie ? 'text-gray-600' : 'text-blue-600'}`}>
                    {state.votingResult.isTie ? 'TIE - NO MAJORITY' : 'WINNER'}
                  </div>
                  <div className={`text-2xl font-bold ${state.votingResult.isTie ? 'text-gray-700' : 'text-blue-900'}`}>
                    {state.votingResult.isTie ? 'No position received majority votes' : state.votingResult.winner}
                  </div>
                </div>

                {state.votingResult.judgeSummary && (
                  <div className="mb-8">
                     <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 shadow-sm">
                       <h3 className="text-lg font-bold text-amber-900 mb-3 flex items-center gap-2">
                          <span className="text-xl">⚖️</span> 
                          <span>Consensus Summary</span>
                       </h3>
                       <div className="prose prose-sm max-w-none text-amber-900/90 leading-relaxed">
                          <Streamdown>{state.votingResult.judgeSummary}</Streamdown>
                       </div>
                     </div>
                  </div>
                )}

                <div className="mb-8">
                  <h4 className="font-semibold mb-4 text-gray-900 border-b border-gray-200 pb-2">Vote Tally</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(state.votingResult.voteCounts).map(([position, count]) => {
                       const totalVotes = Object.values(state.votingResult!.voteCounts).reduce((a, b) => a + b, 0);
                       const percentage = (count / totalVotes) * 100;
                       
                       return (
                        <div key={position} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 relative overflow-hidden">
                          <div 
                            className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-1000 ease-out"
                            style={{ width: `${percentage}%` }}
                          />
                          <div className="flex justify-between items-start mb-1">
                             <div className="text-sm text-gray-500 uppercase tracking-wide font-semibold pr-2">{position}</div>
                             <div className="text-2xl font-bold text-gray-900 leading-none">{count}</div>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {percentage.toFixed(0)}% of votes
                          </div>
                        </div>
                       );
                    })}
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4 border-b border-gray-200 pb-2">Judge Verdicts</h3>
                  <div className="space-y-4">
                    {state.votingResult.verdicts.map((verdict, index) => (
                      <div key={verdict.judgeId} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                             <span className="font-bold text-gray-900">{verdict.judgeName}</span>
                             <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">{verdict.model}</span>
                          </div>
                          <div className="text-sm">
                             <span className="text-gray-500 mr-2">Voted for:</span>
                             <span className="font-bold text-blue-700">{verdict.winner}</span>
                          </div>
                        </div>
                        <div className="p-5 text-gray-700 text-sm leading-relaxed prose prose-sm max-w-none">
                          <Streamdown>{verdict.reasoning}</Streamdown>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Debate Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-gray-50 rounded">
                  <div className="text-gray-600">Topic</div>
                  <div className="font-semibold line-clamp-3" title={state.topic}>{state.topic}</div>
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
