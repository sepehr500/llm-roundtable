# 🎭 LLM Roundtable

A debate platform where multiple AI language models engage in structured debates on any topic. AI models take opposing positions, argue their case, and are judged by a panel of three independent AI judges.

[![Built with Bun](https://img.shields.io/badge/Built%20with-Bun-black?logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)

## Features

- **AI-Generated Positions** - Enter any topic and get opposing viewpoints automatically
- **Multiple AI Models** - Support for 100+ models via OpenRouter (GPT-4, Claude, Gemini, DeepSeek, etc.)
- **Real-Time Streaming** - Watch AI responses appear word-by-word
- **3-Judge Voting System** - Three independent AI judges evaluate each debate with detailed reasoning
- **Consensus Summary** - AI-generated synthesis of all judge verdicts
- **Configurable** - Customize participants, judges, rounds, and system prompts
- **Export Transcripts** - Download complete debates with verdicts

## Getting Started

### Prerequisites

1. [Bun](https://bun.sh/docs/installation) installed
2. [OpenRouter API key](https://openrouter.ai/keys)

### Installation

```bash
git clone https://github.com/[your-username]/llm-roundtable.git
cd llm-roundtable
bun install
```

### Configuration

Create a `.env` file:

```bash
OPENROUTER_API_KEY=your_api_key_here
```

### Run

```bash
bun --hot index.ts
```

Open `http://localhost:3000`

## How It Works

1. Enter a debate topic
2. System generates opposing positions
3. Configure participants (choose AI models, names, colors)
4. Set number of rounds (1-10)
5. Select 3 judge models
6. Start the debate
7. Watch:
   - Research phase (all participants research simultaneously)
   - Opening statements
   - Debate rounds
   - Judging phase (3 judges evaluate in parallel)
8. View results with vote tally and consensus summary
9. Export the transcript

## Tech Stack

- **Bun** - Runtime and bundler
- **TypeScript** - Type safety
- **React 19** - Frontend
- **Tailwind CSS** - Styling
- **AI SDK** - LLM integration
- **OpenRouter** - Access to 100+ AI models
- **WebSocket** - Real-time communication

## Contributing

Contributions welcome! Open an issue or submit a PR.

## License

This project does not currently have a license.

---

<p align="center">
  Built with Bun 🥟 • Powered by AI 🤖
</p>
