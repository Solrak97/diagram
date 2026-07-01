#!/usr/bin/env node
/**
 * Builds the frontend/backend/microservices diagram via diagram MCP tools.
 *
 * Usage:
 *   node scripts/build-architecture-via-mcp.mjs
 *   DIAGRAM_MCP_URL=http://localhost:3100/mcp node scripts/build-architecture-via-mcp.mjs
 */
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const diagramPath = "diagrams/frontend-backend-microservices.yaml";
const fullPath = path.join(root, diagramPath);
const mcpUrl = process.env.DIAGRAM_MCP_URL;

const client = new Client(
  { name: "diagram-builder", version: "1.0.0" },
  { capabilities: {} },
);

async function call(name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  const text = result.content?.find((c) => c.type === "text")?.text ?? "";
  if (result.isError) {
    throw new Error(`${name} failed: ${text}`);
  }
  return text;
}

if (mcpUrl) {
  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
    requestInit: process.env.DIAGRAM_MCP_TOKEN
      ? {
          headers: {
            Authorization: `Bearer ${process.env.DIAGRAM_MCP_TOKEN}`,
          },
        }
      : undefined,
  });
  await client.connect(transport);
} else {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["packages/mcp/dist/index.js"],
    cwd: root,
    stderr: "pipe",
  });
  await client.connect(transport);
}

try {
  if (existsSync(fullPath)) {
    unlinkSync(fullPath);
  }

  await call("diagram_create", {
    path: diagramPath,
    title: "Frontend, Backend & Microservices",
    format: "yaml",
  });

  const shapes = [
    {
      id: "frontend",
      type: "rounded-rectangle",
      x: 60,
      y: 200,
      width: 160,
      height: 80,
      label: "Frontend",
      style: { fill: "#fef3c7" },
      metadata: { role: "frontend", stack: "React" },
    },
    {
      id: "backend",
      type: "rounded-rectangle",
      x: 300,
      y: 200,
      width: 180,
      height: 80,
      label: "Backend API",
      style: { fill: "#dbeafe" },
      metadata: { role: "backend", stack: "Node.js" },
    },
    {
      id: "ms-boundary",
      type: "container",
      x: 560,
      y: 80,
      width: 220,
      height: 320,
      label: "Microservices",
      props: { dashed: true },
      metadata: { role: "boundary" },
    },
    {
      id: "users-svc",
      type: "rectangle",
      x: 590,
      y: 120,
      width: 160,
      height: 70,
      label: "Users Service",
      metadata: { role: "microservice", domain: "users" },
    },
    {
      id: "orders-svc",
      type: "rectangle",
      x: 590,
      y: 210,
      width: 160,
      height: 70,
      label: "Orders Service",
      metadata: { role: "microservice", domain: "orders" },
    },
    {
      id: "notifications-svc",
      type: "rectangle",
      x: 590,
      y: 300,
      width: 160,
      height: 70,
      label: "Notifications Service",
      metadata: { role: "microservice", domain: "notifications" },
    },
  ];

  for (const shape of shapes) {
    await call("diagram_add_shape", {
      path: diagramPath,
      format: "yaml",
      ...shape,
    });
  }

  const connections = [
    {
      fromShapeId: "frontend",
      toShapeId: "backend",
      fromPortId: "right",
      toPortId: "left",
      label: "HTTPS",
    },
    {
      fromShapeId: "backend",
      toShapeId: "users-svc",
      fromPortId: "right",
      toPortId: "left",
      label: "REST",
    },
    {
      fromShapeId: "backend",
      toShapeId: "orders-svc",
      fromPortId: "right",
      toPortId: "left",
      label: "REST",
    },
    {
      fromShapeId: "backend",
      toShapeId: "notifications-svc",
      fromPortId: "right",
      toPortId: "left",
      label: "REST",
    },
  ];

  for (const connection of connections) {
    await call("diagram_connect", {
      path: diagramPath,
      format: "yaml",
      type: "orthogonal",
      ...connection,
    });
  }

  await call("diagram_create_group", {
    path: diagramPath,
    format: "yaml",
    shapeIds: ["users-svc", "orders-svc", "notifications-svc"],
    label: "Microservices",
  });

  const final = await call("diagram_get", {
    path: diagramPath,
    format: "yaml",
  });

  console.log(`Created ${diagramPath} via MCP\n`);
  console.log(final);
} finally {
  await client.close();
}
