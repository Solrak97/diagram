import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const diagramsDir = path.join(repoRoot, "diagrams");

function serveDiagramsPlugin(): Plugin {
  function attach(server: {
    middlewares: {
      use: (
        path: string,
        handler: (
          req: { url?: string },
          res: {
            statusCode: number;
            setHeader: (name: string, value: string) => void;
            end: (body?: string | Buffer) => void;
          },
          next: () => void,
        ) => void,
      ) => void;
    };
  }) {
    server.middlewares.use("/diagrams", (req, res, next) => {
      const urlPath = decodeURIComponent(req.url?.split("?")[0] ?? "/");
      if (urlPath.includes("..")) {
        res.statusCode = 403;
        res.end("Forbidden");
        return;
      }

      const filePath = path.join(diagramsDir, urlPath);
      if (!filePath.startsWith(diagramsDir)) {
        res.statusCode = 403;
        res.end("Forbidden");
        return;
      }

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        next();
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType =
        ext === ".json"
          ? "application/json"
          : ext === ".yaml" || ext === ".yml"
            ? "text/yaml"
            : "application/octet-stream";

      res.setHeader("Content-Type", contentType);
      res.end(fs.readFileSync(filePath));
    });
  }

  return {
    name: "serve-diagrams",
    configureServer(server) {
      attach(server);
    },
    configurePreviewServer(server) {
      attach(server);
    },
    closeBundle() {
      const outDir = path.join(repoRoot, "apps/web/dist/diagrams");
      fs.mkdirSync(outDir, { recursive: true });
      for (const entry of fs.readdirSync(diagramsDir)) {
        const source = path.join(diagramsDir, entry);
        if (fs.statSync(source).isFile()) {
          fs.copyFileSync(source, path.join(outDir, entry));
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), serveDiagramsPlugin()],
  server: {
    port: 5173,
  },
});
