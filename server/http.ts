import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { SessionStore, ApiError } from "./session.ts";

const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".ico": "image/x-icon",
};
async function jsonBody(req: IncomingMessage) {
  if (!req.headers["content-type"]?.startsWith("application/json"))
    throw new ApiError(415, "Content-Type must be application/json.");
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16384) throw new ApiError(413, "Request body exceeds 16 KiB.");
    chunks.push(Buffer.from(chunk));
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new ApiError(400, "Invalid JSON request body.");
  }
}
function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}
export function createAppServer(staticRoot = resolve("dist-static")) {
  const sessions = new SessionStore();
  const root = resolve(staticRoot);
  const server = createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    try {
      // Same-origin only. No wildcard CORS or credential-bearing cluster connection.
      if (
        req.headers.origin &&
        new URL(req.headers.origin).host !== req.headers.host
      )
        throw new ApiError(403, "Cross-origin requests are not allowed.");
      const path = new URL(req.url ?? "/", "http://localhost").pathname;
      if (path === "/api/health" && req.method === "GET") {
        json(res, 200, {
          status: "ok",
          engine: "kubernetes-educational-simulator",
          version: 1,
        });
        return;
      }
      if (path === "/api/sessions" && req.method === "POST") {
        json(res, 201, sessions.create(await jsonBody(req)));
        return;
      }
      const match = /^\/api\/sessions\/([a-f0-9-]{36})$/.exec(path);
      if (match) {
        if (req.method === "GET") {
          json(res, 200, sessions.get(match[1]));
          return;
        }
        if (req.method === "PUT") {
          json(res, 200, sessions.update(match[1], await jsonBody(req)));
          return;
        }
        if (req.method === "DELETE") {
          sessions.delete(match[1]);
          res.writeHead(204);
          res.end();
          return;
        }
        throw new ApiError(405, "Method not allowed.");
      }
      if (path.startsWith("/api/"))
        throw new ApiError(404, "Unknown API route.");
      if (req.method !== "GET" && req.method !== "HEAD")
        throw new ApiError(405, "Method not allowed.");
      let decoded: string;
      try {
        decoded = decodeURIComponent(path);
      } catch {
        throw new ApiError(400, "Invalid URL encoding.");
      }
      const file = resolve(
        root,
        "." + (decoded === "/" ? "/index.html" : decoded),
      );
      if (!file.startsWith(root + sep) || !mime[extname(file)])
        throw new ApiError(404, "Asset not found.");
      try {
        if (!(await stat(file)).isFile())
          throw new ApiError(404, "Asset not found.");
        const bytes = await readFile(file);
        res.writeHead(200, {
          "Content-Type": mime[extname(file)],
          "Content-Length": bytes.length,
          "Cache-Control":
            extname(file) === ".html" ? "no-cache" : "public, max-age=3600",
        });
        res.end(req.method === "HEAD" ? undefined : bytes);
      } catch (error) {
        if (error instanceof ApiError) throw error;
        if ((error as NodeJS.ErrnoException).code === "ENOENT")
          throw new ApiError(
            404,
            "Frontend asset not built. Run npm run build:local.",
          );
        throw error;
      }
    } catch (error) {
      if (error instanceof ApiError)
        json(res, error.status, { error: error.message });
      else {
        console.error(
          "Simulation request failed:",
          error instanceof Error ? error.name : "UnknownError",
        );
        json(res, 500, { error: "The simulation request failed." });
      }
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return server;
}
