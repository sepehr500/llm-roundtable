import { sessionManager } from "./src/server/session-manager.ts";
import { DebateEngine } from "./src/server/debate-engine.ts";
import type { ServerWebSocket } from "bun";

// Track debate engines for each session
const debateEngines = new Map<string, DebateEngine>();

function getOrCreateEngine(sessionId: string): DebateEngine {
  if (!debateEngines.has(sessionId)) {
    debateEngines.set(sessionId, new DebateEngine(sessionId));
  }
  return debateEngines.get(sessionId)!;
}

const server = Bun.serve<{ sessionId: string | null }>({
  port: process.env.PORT || 3000,

  async fetch(req, server) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Upgrade to WebSocket
    if (server.upgrade(req, { data: { sessionId: null } })) {
      return; // WebSocket upgrade handled
    }

    // Serve index.html
    if (path === "/") {
      return new Response(Bun.file("./index.html"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Serve CSS files
    if (path.endsWith(".css")) {
      return new Response(Bun.file("." + path), {
        headers: { "Content-Type": "text/css" },
      });
    }

    // Serve TypeScript/JavaScript files (Bun will transpile them)
    if (path.endsWith(".tsx") || path.endsWith(".ts") || path.endsWith(".jsx") || path.endsWith(".js")) {
      const file = Bun.file("." + path);
      const transpiled = await Bun.build({
        entrypoints: ["." + path],
        format: "esm",
      });

      if (transpiled.success && transpiled.outputs.length > 0) {
        return new Response(transpiled.outputs[0], {
          headers: { "Content-Type": "application/javascript" },
        });
      }
    }

    // POST /api/session - Create new session
    if (path === "/api/session" && req.method === "POST") {
      const sessionId = sessionManager.createSession();
      return Response.json({ sessionId });
    }

    // GET /api/models - Get available models
    if (path === "/api/models" && req.method === "GET") {
      try {
        const { getAvailableModels } = await import("./src/server/llm-service.ts");
        const models = await getAvailableModels();
        return Response.json({ models });
      } catch (error) {
        console.error("Error fetching models:", error);
        return Response.json({ error: "Failed to fetch models" }, { status: 500 });
      }
    }

    // POST /api/session/:sessionId/topic - Submit topic
    if (path.startsWith("/api/session/") && path.endsWith("/topic") && req.method === "POST") {
      try {
        const sessionId = path.split("/")[3];
        if (!sessionId) {
          return Response.json({ error: "Session ID required" }, { status: 400 });
        }
        const { topic } = await req.json();
        const state = sessionManager.getSession(sessionId);

        if (!state) {
          return Response.json({ error: "Session not found" }, { status: 404 });
        }

        state.topic = topic;
        state.phase = "position-generation";

        const engine = getOrCreateEngine(sessionId);
        const positions = await engine.generatePositions();

        state.suggestedPositions = positions;
        state.phase = "position-confirmation";

        sessionManager.broadcast(sessionId, {
          type: "positions-generated",
          positions,
          topic: state.topic,
        });
        sessionManager.broadcast(sessionId, {
          type: "phase-change",
          phase: "position-confirmation",
        });

        return Response.json({ positions });
      } catch (error) {
        console.error("Error in topic endpoint:", error);
        return Response.json(
          { error: "Failed to generate positions" },
          { status: 500 }
        );
      }
    }

    // POST /api/session/:sessionId/confirm - Confirm positions and start debate
    if (path.startsWith("/api/session/") && path.endsWith("/confirm") && req.method === "POST") {
      try {
        const sessionId = path.split("/")[3];
        if (!sessionId) {
          return Response.json({ error: "Session ID required" }, { status: 400 });
        }
        const { participants, maxRounds, judgeModel, customSystemPrompt } = await req.json();
        const state = sessionManager.getSession(sessionId);

        if (!state) {
          return Response.json({ error: "Session not found" }, { status: 404 });
        }

        state.participants = participants;
        state.maxRounds = maxRounds;
        if (judgeModel) {
          state.judgeModel = judgeModel;
        }
        if (customSystemPrompt) {
          state.customSystemPrompt = customSystemPrompt;
        }
        state.phase = "research-ready";

        sessionManager.broadcast(sessionId, {
          type: "phase-change",
          phase: "research-ready",
        });

        return Response.json({ success: true });
      } catch (error) {
        console.error("Error in confirm endpoint:", error);
        return Response.json(
          { error: "Failed to confirm positions" },
          { status: 500 }
        );
      }
    }

    // POST /api/session/:sessionId/start-research - Start research phase
    if (path.startsWith("/api/session/") && path.endsWith("/start-research") && req.method === "POST") {
      try {
        const sessionId = path.split("/")[3];
        const state = sessionManager.getSession(sessionId);

        if (!state) {
          return Response.json({ error: "Session not found" }, { status: 404 });
        }

        state.phase = "research";
        sessionManager.broadcast(sessionId, {
          type: "phase-change",
          phase: "research",
        });

        const engine = getOrCreateEngine(sessionId);

        // Run research phase (non-blocking)
        (async () => {
          try {
            console.log(`[${sessionId}] Starting research phase...`);
            await engine.runResearchPhase();
            console.log(`[${sessionId}] Research phase complete!`);
          } catch (error) {
            console.error(`[${sessionId}] Error during research:`, error);
            sessionManager.broadcast(sessionId, {
              type: "error",
              message: error instanceof Error ? error.message : "Unknown error occurred",
            });
          }
        })();

        return Response.json({ success: true });
      } catch (error) {
        console.error("Error in start-research endpoint:", error);
        return Response.json(
          { error: "Failed to start research" },
          { status: 500 }
        );
      }
    }

    // POST /api/session/:sessionId/start-opening - Start opening statements phase
    if (path.startsWith("/api/session/") && path.endsWith("/start-opening") && req.method === "POST") {
      try {
        const sessionId = path.split("/")[3];
        const state = sessionManager.getSession(sessionId);

        if (!state) {
          return Response.json({ error: "Session not found" }, { status: 404 });
        }

        state.phase = "opening-statements";
        sessionManager.broadcast(sessionId, {
          type: "phase-change",
          phase: "opening-statements",
        });

        const engine = getOrCreateEngine(sessionId);

        // Run opening statements phase (non-blocking)
        (async () => {
          try {
            console.log(`[${sessionId}] Starting opening statements...`);
            await engine.runOpeningStatements();
            console.log(`[${sessionId}] Opening statements complete!`);
          } catch (error) {
            console.error(`[${sessionId}] Error during opening statements:`, error);
            sessionManager.broadcast(sessionId, {
              type: "error",
              message: error instanceof Error ? error.message : "Unknown error occurred",
            });
          }
        })();

        return Response.json({ success: true });
      } catch (error) {
        console.error("Error in start-opening endpoint:", error);
        return Response.json(
          { error: "Failed to start opening statements" },
          { status: 500 }
        );
      }
    }

    // POST /api/session/:sessionId/start-debate - Start debate rounds phase
    if (path.startsWith("/api/session/") && path.endsWith("/start-debate") && req.method === "POST") {
      try {
        const sessionId = path.split("/")[3];
        const state = sessionManager.getSession(sessionId);

        if (!state) {
          return Response.json({ error: "Session not found" }, { status: 404 });
        }

        state.phase = "debate";
        sessionManager.broadcast(sessionId, {
          type: "phase-change",
          phase: "debate",
        });

        const engine = getOrCreateEngine(sessionId);

        // Run debate rounds phase (non-blocking)
        (async () => {
          try {
            console.log(`[${sessionId}] Starting debate rounds...`);
            await engine.runDebateRounds();
            console.log(`[${sessionId}] Debate rounds complete!`);
          } catch (error) {
            console.error(`[${sessionId}] Error during debate:`, error);
            sessionManager.broadcast(sessionId, {
              type: "error",
              message: error instanceof Error ? error.message : "Unknown error occurred",
            });
          }
        })();

        return Response.json({ success: true });
      } catch (error) {
        console.error("Error in start-debate endpoint:", error);
        return Response.json(
          { error: "Failed to start debate rounds" },
          { status: 500 }
        );
      }
    }

    // POST /api/session/:sessionId/start-judging - Start judging phase
    if (path.startsWith("/api/session/") && path.endsWith("/start-judging") && req.method === "POST") {
      try {
        const sessionId = path.split("/")[3];
        const state = sessionManager.getSession(sessionId);

        if (!state) {
          return Response.json({ error: "Session not found" }, { status: 404 });
        }

        state.phase = "judging";
        sessionManager.broadcast(sessionId, {
          type: "phase-change",
          phase: "judging",
        });

        const engine = getOrCreateEngine(sessionId);

        // Run judging phase (non-blocking)
        (async () => {
          try {
            console.log(`[${sessionId}] Starting judging...`);
            await engine.runJudging();
            console.log(`[${sessionId}] Judging complete!`);
          } catch (error) {
            console.error(`[${sessionId}] Error during judging:`, error);
            sessionManager.broadcast(sessionId, {
              type: "error",
              message: error instanceof Error ? error.message : "Unknown error occurred",
            });
          }
        })();

        return Response.json({ success: true });
      } catch (error) {
        console.error("Error in start-judging endpoint:", error);
        return Response.json(
          { error: "Failed to start judging" },
          { status: 500 }
        );
      }
    }

    // GET /api/session/:sessionId - Get session state
    if (path.startsWith("/api/session/") && req.method === "GET") {
      const sessionId = path.split("/")[3];
      const state = sessionManager.getSession(sessionId);

      if (!state) {
        return Response.json({ error: "Session not found" }, { status: 404 });
      }

      // Convert Set to Array for JSON serialization
      return Response.json({
        ...state,
        researchComplete: Array.from(state.researchComplete),
      });
    }

    return new Response("Not Found", { status: 404 });
  },

  websocket: {
    open(ws) {
      ws.data = { sessionId: null };
      console.log("WebSocket connection opened");
    },

    message(ws, message) {
      try {
        const msg = JSON.parse(message.toString());

        if (msg.type === "connect" && msg.sessionId) {
          ws.data.sessionId = msg.sessionId;
          sessionManager.addWebSocket(msg.sessionId, ws);
          console.log(`WebSocket connected to session: ${msg.sessionId}`);
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    },

    close(ws) {
      if (ws.data.sessionId) {
        sessionManager.removeWebSocket(ws.data.sessionId, ws);
        console.log(`WebSocket disconnected from session: ${ws.data.sessionId}`);
      }
    },
  },
});

console.log(`🚀 Server running at http://localhost:${server.port}`);
