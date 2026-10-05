import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const root = path.resolve("dist-static");
const base = process.env.PUBLIC_BASE_PATH ?? "/";
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.ok(html.includes("Kubernetes Observatory"));
assert.ok(html.includes('name="viewport"'));
assert.ok(html.includes('id="root"'));
const references = [
  ...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g),
].map((m) => m[1]);
assert.ok(references.some((x) => x.endsWith(".js")));
assert.ok(references.some((x) => x.endsWith(".css")));
let js = "",
  css = "";
for (const ref of references) {
  assert.ok(
    ref.startsWith(base),
    `Asset ${ref} must use the configured base ${base}`,
  );
  const content = fs.readFileSync(
    path.join(root, ref.slice(base.length)),
    "utf8",
  );
  if (ref.endsWith(".js")) js += content;
  else css += content;
}
for (const marker of [
  "Regional recovery",
  "Horizontal Pod Autoscaler",
  "Follow a request",
  "NetworkPolicy",
  "Kubernetes Observatory",
  "dependency-outage",
])
  assert.ok(js.includes(marker), `Missing content: ${marker}`);
assert.ok(css.includes("prefers-reduced-motion"));
assert.ok(css.includes("@media"));
assert.ok(fs.existsSync(path.join(root, "favicon.svg")));
assert.ok(!fs.existsSync(path.join(root, ".env")));
for (const forbidden of [
  "NxNotifier",
  "nextracker.com",
  "visualstudio.com",
  "AUTH_API_SERVER",
])
  assert.ok(
    !js.includes(forbidden),
    `Private workload marker in public build: ${forbidden}`,
  );
fs.writeFileSync(path.join(root, ".nojekyll"), "");
console.log(
  `Static artifact verified: ${references.length} assets, content, base path ${base}, responsive styles, and public-only content.`,
);
