#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { DiagramStore, getRegistry } from "./store.js";
import { createDiagramMcpServer } from "./server.js";

const workspaceRoot =
  process.env.DIAGRAM_WORKSPACE ??
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const host = process.env.DIAGRAM_MCP_HOST ?? "0.0.0.0";
const port = Number(process.env.DIAGRAM_MCP_PORT ?? "3100");
const mcpPath = process.env.DIAGRAM_MCP_PATH ?? "/mcp";
const authToken = process.env.DIAGRAM_MCP_TOKEN;
const corsOrigin = process.env.DIAGRAM_MCP_CORS_ORIGIN ?? "*";

const allowedHosts = process.env.DIAGRAM_MCP_ALLOWED_HOSTS
  ?.split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const store = new DiagramStore({ workspaceRoot });
const registry = getRegistry();

const transports = new Map<string, StreamableHTTPServerTransport>();

const app = createMcpExpressApp({
  host,
  ...(allowedHosts?.length ? { allowedHosts } : {}),
});

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", corsOrigin);
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, mcp-session-id, last-event-id, mcp-protocol-version",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
});

if (authToken) {
  app.use((req, res, next) => {
    if (req.path === "/health") {
      next();
      return;
    }

    const header = req.headers.authorization;
    if (header === `Bearer ${authToken}`) {
      next();
      return;
    }

    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized" },
      id: null,
    });
  });
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "diagram-mcp",
    sessions: transports.size,
    workspace: workspaceRoot,
  });
});

function jsonRpcError(res: Response, status: number, message: string, id: unknown) {
  res.status(status).json({
    jsonrpc: "2.0",
    error: { code: -32000, message },
    id: id ?? null,
  });
}

async function handleMcpRequest(req: Request, res: Response) {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport = sessionId ? transports.get(sessionId) : undefined;

  if (!transport) {
    if (req.method !== "POST" || !isInitializeRequest(req.body)) {
      jsonRpcError(
        res,
        400,
        "Bad Request: No valid session. Send an initialize request without mcp-session-id.",
        req.body?.id,
      );
      return;
    }

    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transports.set(id, transport!);
      },
      onsessionclosed: (id) => {
        transports.delete(id);
      },
    });

    transport.onclose = () => {
      const id = transport?.sessionId;
      if (id) transports.delete(id);
    };

    const server = createDiagramMcpServer({ store, registry });
    await server.connect(transport);
  }

  await transport.handleRequest(req, res, req.body);
}

app.post(mcpPath, handleMcpRequest);
app.get(mcpPath, handleMcpRequest);
app.delete(mcpPath, handleMcpRequest);

const httpServer = app.listen(port, host, () => {
  const baseUrl = `http://${host === "0.0.0.0" ? "localhost" : host}:${port}`;
  console.log(`Diagram MCP HTTP server listening on ${baseUrl}${mcpPath}`);
  if (authToken) {
    console.log("Bearer token authentication enabled");
  }
});

function shutdown() {
  console.log("Shutting down diagram MCP HTTP server...");
  for (const transport of transports.values()) {
    void transport.close();
  }
  transports.clear();
  httpServer.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
