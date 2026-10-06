import test from "node:test";
import assert from "node:assert/strict";
import { concepts } from "../data/concepts.ts";
import { applicationCourse } from "../data/application-course.ts";
import {
  defaultOrbit,
  spatialPosition,
  project,
  spatialFlightPose,
  orbitBounds,
  podPosition,
} from "./spatial.ts";
const camera = {
  ...defaultOrbit,
  target: { x: 0, y: 80, z: 0 },
  distance: 1670,
  center: { x: 850, y: 430 },
};
test("every library resource and application stop has a finite perspective location", () => {
  for (const id of [
    ...concepts.map((c) => c.id),
    "node-a",
    "node-b",
    "node-c",
    "frontend-service",
  ]) {
    const p = spatialPosition(id),
      q = project(p, camera);
    assert.ok(
      [p.x, p.y, p.z, q.x, q.y, q.depth, q.scale].every(Number.isFinite),
      id,
    );
  }
  for (const stop of applicationCourse.steps)
    assert.ok(
      Object.values(spatialPosition(stop.node, 1, stop.anchor)).every(
        Number.isFinite,
      ),
    );
  assert.deepEqual(
    spatialPosition("pods", 1, applicationCourse.steps[8].anchor),
    podPosition(0, 0),
  );
  assert.deepEqual(
    spatialPosition("kubelet", 1, applicationCourse.steps[7].anchor),
    spatialPosition("node-a"),
  );
});
test("geometry behind the near plane is flagged instead of appearing in front of the camera", () => {
  const behind = { x: 0, y: 0, z: 2000 };
  const q = project(behind, {
    ...camera,
    yaw: 0,
    pitch: 0.15,
    target: { x: 0, y: 0, z: 0 },
    distance: 630,
  });
  assert.equal(q.visible, false);
  assert.ok(Number.isFinite(q.x) && Number.isFinite(q.y));
  assert.equal(
    project(
      { x: 0, y: 0, z: 0 },
      { ...camera, target: { x: 0, y: 0, z: 0 }, distance: 630 },
    ).visible,
    true,
  );
});
test("perspective exploration changes depth and keeps the destination centered during orbit and separation", () => {
  for (const yaw of [-2, -0.32, 0, 1, 2])
    for (const pitch of [0.15, 0.48, 1.1])
      for (const separation of [0.2, 1, 1.6]) {
        const target = spatialPosition("api", separation),
          c = { ...camera, yaw, pitch, separation, target, distance: 630 };
        assert.deepEqual(
          { x: project(target, c).x, y: project(target, c).y },
          c.center,
        );
      }
  const before = project(spatialPosition("etcd"), camera),
    after = project(spatialPosition("etcd"), { ...camera, yaw: 1 });
  assert.notEqual(before.x, after.x);
  assert.notEqual(before.depth, after.depth);
  assert.equal(
    orbitBounds({ ...defaultOrbit, pitch: 5, separation: -10 }).pitch,
    1.1,
  );
  assert.equal(
    orbitBounds({ ...defaultOrbit, pitch: 5, separation: -10 }).separation,
    0.2,
  );
});
test("three-dimensional travel ascends and descends continuously through departure and arrival", () => {
  for (const [a, b] of [
    ["api", "pods"],
    ["pvc", "api"],
    ["service", "gateway"],
  ]) {
    const from = spatialPosition(a),
      to = spatialPosition(b);
    assert.deepEqual(spatialFlightPose(from, to, 630, 0).target, from);
    assert.equal(spatialFlightPose(from, to, 630, 0).distance, 630);
    assert.deepEqual(spatialFlightPose(from, to, 630, 1).target, to);
    assert.equal(spatialFlightPose(from, to, 630, 1).distance, 630);
    for (const boundary of [0.2, 0.7]) {
      const left = spatialFlightPose(from, to, 630, boundary - 1e-6),
        right = spatialFlightPose(from, to, 630, boundary + 1e-6);
      assert.ok(Math.abs(left.distance - right.distance) < 0.1);
      assert.ok(
        Math.hypot(
          left.target.x - right.target.x,
          left.target.y - right.target.y,
          left.target.z - right.target.z,
        ) < 0.1,
      );
    }
  }
});
