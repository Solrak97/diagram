#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DiagramStore, getRegistry } from "./store.js";
import { createDiagramMcpServer } from "./server.js";

const workspaceRoot =
  process.env.DIAGRAM_WORKSPACE ??
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const store = new DiagramStore({ workspaceRoot });
const registry = getRegistry();

const server = createDiagramMcpServer({ store, registry });
const transport = new StdioServerTransport();
await server.connect(transport);
