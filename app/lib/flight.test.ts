import test from "node:test";
import assert from "node:assert/strict";
import { concepts, conceptById } from "../data/concepts.ts";
import {
  flightMission,
  flightPose,
  focusedCamera,
  panCamera,
  resourceAnchor,
  screenPoint,
  failureFlight,
} from "./flight.ts";
import { labFrame } from "./lab.ts";
import { readyBackends } from "./simulation.ts";

test("every resource has a finite reachable destination and a complete tour stop", () => {
  const tour = flightMission("grand-tour")!;
  assert.equal(tour.steps.length, concepts.length);
  assert.equal(new Set(tour.steps.map((s) => s.node)).size, concepts.length);
  for (const c of concepts) {
    const anchor = resourceAnchor(c.id);
    assert.ok(Number.isFinite(anchor.x) && Number.isFinite(anchor.y), c.id);
    const screen = screenPoint(anchor, focusedCamera(anchor));
    assert.ok(
      Math.abs(screen.x - 900) < 0.000001 &&
        Math.abs(screen.y - 520) < 0.000001,
      c.id,
    );
    assert.ok(flightMission(`visit:${c.id}`)?.steps[0].body, c.id);
  }
  assert.throws(() => resourceAnchor("unknown"), /No flight destination/);
  assert.equal(flightMission("lab:unknown"), undefined);
});
test("the camera departs continuously, follows the ship, and arrives on the actual resource", () => {
  const from = resourceAnchor("clients"),
    to = resourceAnchor("api"),
    original = { x: 123, y: -40, zoom: 1.4 };
  assert.deepEqual(flightPose(original, from, to, 0).camera, original);
  assert.deepEqual(flightPose(original, from, to, 1).ship, to);
  assert.deepEqual(flightPose(original, from, to, 1).camera, focusedCamera(to));
  for (const t of [0.2, 0.4, 0.7]) {
    const pose = flightPose(original, from, to, t);
    const visible = screenPoint(pose.ship, pose.camera);
    assert.ok(Math.abs(visible.x - 900) < 0.00001);
    assert.ok(Math.abs(visible.y - 520) < 0.00001);
  }
  for (const boundary of [0.2, 0.7]) {
    const a = flightPose(original, from, to, boundary - 0.00001),
      b = flightPose(original, from, to, boundary + 0.00001);
    assert.ok(Math.abs(a.camera.x - b.camera.x) < 1);
    assert.ok(Math.abs(a.camera.y - b.camera.y) < 1);
  }
  for (const t of [-2, Infinity, NaN, 5]) {
    const p = flightPose(original, from, to, t);
    assert.ok(Number.isFinite(p.camera.x) && Number.isFinite(p.angle));
    assert.ok(p.progress >= 0 && p.progress <= 1);
  }
});
test("request flight distinguishes DNS discovery and shows an explicit return to the client", () => {
  const steps = flightMission("request")!.steps;
  assert.equal(steps.find((s) => s.node === "dns")?.phase, "Discovery");
  const returning = steps.filter((s) => s.phase === "Response returns");
  assert.ok(returning.length >= 4);
  assert.equal(returning.at(-1)?.node, "clients");
  assert.ok(!steps.some((s) => ["api", "etcd", "scheduler"].includes(s.node)));
});
test("dragging after a close-up cannot snap the camera back to the old overview bounds", () => {
  for (const c of concepts) {
    const destination = resourceAnchor(c.id),
      before = focusedCamera(destination);
    const dragged = panCamera(before, { x: 1, y: -2 });
    const point = screenPoint(destination, dragged);
    assert.ok(Math.abs(point.x - 901) < 0.000001, c.id);
    assert.ok(Math.abs(point.y - 518) < 0.000001, c.id);
    assert.equal(dragged.zoom, before.zoom);
  }
});
test("failure camera stops are synchronized with real modeled state changes and explicit repairs", () => {
  const pod = failureFlight("pod-failure", false, false);
  const ready = pod.steps.map(
    (s) => labFrame("pod-failure", s.time!, false).simulation.ready,
  );
  assert.equal(ready[0], 5);
  assert.equal(ready.at(-1), 6);
  assert.ok(pod.steps.some((s) => s.node === "scheduler" && s.time === 12));
  for (const scenario of [
    "zone-failure",
    "traffic-spike",
    "rollout",
    "region-failure",
    "policy-block",
    "dependency-outage",
  ] as const) {
    const mission = failureFlight(scenario, false, false);
    for (const s of mission.steps) {
      assert.ok(conceptById[s.node]);
      resourceAnchor(s.node);
    }
    const frame = labFrame(scenario, mission.steps.at(-1)!.time!, false);
    if (
      ["region-failure", "policy-block", "dependency-outage"].includes(scenario)
    )
      assert.equal(readyBackends(frame.simulation), 0);
  }
});
