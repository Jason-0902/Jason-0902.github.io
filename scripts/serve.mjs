// Minimal static server for _site/, mirroring GitHub Pages behavior (dir -> index.html, 404.html fallback).
// Used by Playwright and for local preview: `npm run serve` then open http://localhost:4173.
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "_site");
const port = Number(process.env.PORT ?? 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};

async function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const target = path.normalize(path.join(root, decoded));
  if (target !== root && !target.startsWith(root + path.sep)) return null; // path traversal guard
  try {
    const info = await stat(target);
    if (info.isDirectory()) {
      if (!decoded.endsWith("/")) return { redirect: `${urlPath}/` };
      return resolveFile(path.posix.join(urlPath, "index.html"));
    }
    return { file: target };
  } catch {
    return null;
  }
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  let resolved;
  try {
    resolved = await resolveFile(url.pathname);
  } catch {
    resolved = null;
  }
  if (resolved?.redirect) {
    response.writeHead(301, { Location: resolved.redirect });
    response.end();
    return;
  }
  const status = resolved ? 200 : 404;
  const file = resolved?.file ?? path.join(root, "404.html");
  response.writeHead(status, {
    "Content-Type": types[path.extname(file)] ?? "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  createReadStream(file).pipe(response);
}).listen(port, () => console.log(`Serving _site/ at http://localhost:${port}`));
