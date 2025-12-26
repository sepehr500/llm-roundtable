import React, { useState } from 'react';

interface Props {
  sessionId: string;
}

export function TopicProposal({ sessionId }: Props) {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!topic.trim()) return;

    setLoading(true);
    try {
      await fetch(`/api/session/${sessionId}/topic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
    } catch (error) {
      console.error('Error submitting topic:', error);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-bold mb-4">Propose a Debate Topic</h2>
      <p className="text-gray-600 mb-4">
        Enter a topic that you'd like to see LLMs debate. The AI will suggest
        different positions on this topic.
      </p>
      <textarea
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Enter a debate topic... (e.g., 'Universal Basic Income', 'Space Exploration Priorities', 'AI Safety Regulations')"
        rows={4}
        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <button
        onClick={handleSubmit}
        disabled={!topic.trim() || loading}
        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Generating Positions...' : 'Generate Positions'}
      </button>
    </div>
  );
}
