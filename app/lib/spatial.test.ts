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
  viewportCamera,
  focusDistance,
  spatialPlanes,
  zoomDistance,
} from "./spatial.ts";
const camera = {
  ...defaultOrbit,
  target: { x: 0, y: 80, z: 0 },
  distance: 1670,
  center: { x: 850, y: 430 },
};
test("zoom out escapes every close-up and buttons and wheel share reversible distance scaling", () => {
  for (const start of [200, focusDistance(1260, 660), 630, 1670, 3600]) {
    let distance = start;
    for (let click = 0; click < 12; click++)
      distance = zoomDistance(distance, 1.2);
    assert.ok(
      distance >= 1670,
      "zoom-out cannot be trapped at a close-up scale",
    );
    const out = zoomDistance(start, 1.2);
    if (out < 8000)
      assert.ok(Math.abs(zoomDistance(out, 1 / 1.2) - start) < 1e-6);
    const wheel = zoomDistance(start, Math.exp(0.15));
    assert.ok(Math.abs(zoomDistance(wheel, Math.exp(-0.15)) - start) < 1e-6);
  }
  assert.equal(zoomDistance(1670, NaN), 1670);
  assert.equal(zoomDistance(200, 0.2), 200);
  assert.equal(zoomDistance(8000, 2), 8000);
});
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
    1.4,
  );
  assert.equal(
    orbitBounds({ ...defaultOrbit, pitch: 5, separation: -10 }).separation,
    0.2,
  );
});
test("responsive camera frames resources at readable size in wide and narrow lesson viewports", () => {
  for (const [width, height] of [
    [1260, 660],
    [720, 440],
    [360, 390],
  ]) {
    const viewport = viewportCamera(width, height);
    const target = spatialPosition("api");
    const c = {
      ...camera,
      target,
      focal: viewport.focal,
      distance: focusDistance(width, height),
      center: { x: width / 2, y: height / 2 },
    };
    const base = project(target, c);
    const top = project({ ...target, y: target.y + 65 }, c);
    assert.equal(base.x, width / 2);
    assert.equal(base.y, height / 2);
    assert.ok(top.visible);
    assert.ok(
      base.y - top.y > Math.min(width, height) * 0.2,
      "resource cannot collapse to a tiny fixed-canvas label",
    );
    assert.ok(
      base.y - top.y < height / 2,
      "resource stays inside its scene viewport",
    );
    const flight = spatialFlightPose(target, target, 1670, 1, c.distance);
    assert.ok(Math.abs(flight.distance - c.distance) < 1e-6);
  }
});
test("exploration can look below and above a layer while keeping the resource centered", () => {
  for (const pitch of [-1.4, -0.5, 0, 0.5, 1.4]) {
    const target = spatialPosition("service");
    const c = { ...camera, ...orbitBounds({ ...defaultOrbit, pitch }), target };
    assert.equal(project(target, c).y, c.center.y);
    assert.equal(c.pitch, pitch);
  }
});
test("platform focus fits its area and enlarges the layer relative to the overview", () => {
  for (const [width, height] of [
    [1260, 660],
    [360, 390],
  ]) {
    const viewport = viewportCamera(width, height);
    for (const plane of spatialPlanes) {
      const target = { x: plane.x, y: plane.y, z: plane.z };
      const c = {
        ...camera,
        target,
        focal: viewport.focal,
        distance: focusDistance(
          width,
          height,
          Math.max(plane.w, plane.d),
          true,
        ),
        center: { x: width / 2, y: height / 2 },
      };
      for (const x of [-plane.w, plane.w])
        for (const z of [-plane.d, plane.d]) {
          const point = project(
            { x: target.x + x, y: target.y, z: target.z + z },
            c,
          );
          assert.ok(point.visible, plane.id);
          assert.ok(point.x >= 0 && point.x <= width, plane.id);
          assert.ok(point.y >= 0 && point.y <= height, plane.id);
        }
      if (width > 900)
        assert.ok(
          c.distance < 1670,
          "platform click must move closer on desktop",
        );
    }
  }
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
