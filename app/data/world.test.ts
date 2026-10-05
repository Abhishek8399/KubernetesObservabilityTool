import test from "node:test";
import assert from "node:assert/strict";
import { conceptById } from "./concepts.ts";
import {
  worldNodes,
  worldLinks,
  flowDenied,
  componentUnavailable,
} from "./world.ts";
import { simulate } from "../lib/simulation.ts";

test("the dimensional world has unique, reachable concept references", () => {
  const ids = new Set(worldNodes.map((node) => node.id));
  assert.equal(ids.size, worldNodes.length);
  ids.add("pods");
  ids.add("nodes");
  for (const node of worldNodes) {
    assert.ok(conceptById[node.id], node.id);
    assert.equal(node.layer, conceptById[node.id].layer);
    assert.ok(node.x > 0 && node.x < 1800 && node.y > 0 && node.y < 1160);
  }
  for (const link of worldLinks) {
    assert.ok(ids.has(link.from), link.from);
    assert.ok(ids.has(link.to), link.to);
  }
});

test("request animation cannot imply that packets traverse the control plane or DNS", () => {
  const forbidden = new Set([
    "api",
    "etcd",
    "controllers",
    "scheduler",
    "dns",
    "coredns",
  ]);
  const traffic = worldLinks.filter((link) => link.kind === "traffic");
  assert.ok(
    traffic.some((link) => link.from === "service" && link.to === "pods"),
  );
  for (const link of traffic) {
    assert.ok(!forbidden.has(link.from), link.from);
    assert.ok(!forbidden.has(link.to), link.to);
  }
});

test("a denied network flow does not depict a failed database or policy engine", () => {
  const s = simulate("policy-block", 1, false);
  const denied = worldLinks.filter((link) =>
    flowDenied(link, "policy-block", s),
  );
  assert.deepEqual(
    denied.map((link) => [link.from, link.to]),
    [["service", "pods"]],
  );
  assert.equal(
    componentUnavailable(
      worldNodes.find((n) => n.id === "database")!,
      "policy-block",
      s,
    ),
    false,
  );
  assert.equal(
    componentUnavailable(
      worldNodes.find((n) => n.id === "networkpolicy")!,
      "policy-block",
      s,
    ),
    false,
  );
});

test("a dependency outage blocks its boundary while client-to-Pod traffic remains possible", () => {
  const s = simulate("dependency-outage", 1, false);
  const denied = worldLinks.filter((link) =>
    flowDenied(link, "dependency-outage", s),
  );
  assert.deepEqual(
    denied.map((link) => [link.from, link.to]),
    [["pods", "database"]],
  );
  assert.equal(
    componentUnavailable(
      worldNodes.find((n) => n.id === "database")!,
      "dependency-outage",
      s,
    ),
    true,
  );
});
