import test from "node:test";
import assert from "node:assert/strict";
import { worldLinks } from "./world.ts";
import { explainConnection } from "./connections.ts";
test("every selectable connection has a specific explanation", () => {
  for (const link of worldLinks) {
    const explanation = explainConnection(link);
    assert.notEqual(
      explanation.title,
      "Inspect this architecture boundary",
      `${link.from}:${link.to}`,
    );
    assert.ok(explanation.body.length > 90);
  }
});
test("connection lessons preserve API, scheduler and DNS boundaries", () => {
  assert.match(
    explainConnection({ from: "scheduler", to: "nodes", kind: "control" }).body,
    /kubelet.*runtime.*does not launch/,
  );
  assert.match(
    explainConnection({ from: "clients", to: "dns", kind: "dependency" }).body,
    /do not travel.*as a proxy/,
  );
  assert.match(
    explainConnection({ from: "service", to: "pods", kind: "traffic" }).body,
    /metadata.*not a running proxy/,
  );
});
