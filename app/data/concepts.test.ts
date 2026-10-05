import test from "node:test";
import assert from "node:assert/strict";
import { concepts, conceptById, mapNodes, mapLinks } from "./concepts.ts";
import { journeys } from "./journeys.ts";
test("the library has unique, complete, sourced entries", () => {
  assert.ok(concepts.length >= 60);
  assert.equal(new Set(concepts.map((c) => c.id)).size, concepts.length);
  for (const c of concepts) {
    assert.ok(c.summary && c.how && c.pitfall && c.command);
    assert.ok(c.source.startsWith("https://kubernetes.io/"));
  }
});
test("diagram and journey references cannot select nonexistent components", () => {
  for (const n of mapNodes) assert.ok(conceptById[n.id], n.id);
  for (const j of journeys)
    for (const s of j.steps) assert.ok(conceptById[s.node], s.node);
  const ids = new Set(mapNodes.map((n) => n.id));
  for (const link of mapLinks) {
    assert.ok(ids.has(link.from));
    assert.ok(ids.has(link.to));
  }
});
test("critical architecture boundaries remain explicit", () => {
  assert.match(conceptById.service.how, /metadata, not packet hops/);
  assert.match(conceptById.dr.pitfall, /does not automatically/);
  assert.match(conceptById.pdb.pitfall, /voluntary|crashes/);
  assert.match(conceptById.secrets.pitfall, /Base64 is not encryption/);
});
