import test from "node:test";
import assert from "node:assert/strict";
import { placeLabels, overlaps, type SceneLabel } from "./scene-labels.ts";
import { worldNodes } from "../data/world.ts";
import {
  spatialPosition,
  project,
  defaultOrbit,
  viewportCamera,
} from "./spatial.ts";

test("crowded names stay inside the scene, avoid models and each other, and prioritize a failed Pod", () => {
  const labels: SceneLabel[] = Array.from({ length: 12 }, (_, i) => ({
    id: String(i),
    text: i === 0 ? "Pod C2 lost" : "Control component",
    color: "white",
    x: 340 + i * 9,
    y: 220 + i * 3,
    above: 170,
    priority: i === 0 ? 100 : 10,
  }));
  const objects = [{ x: 285, y: 160, width: 90, height: 65 }];
  const result = placeLabels(labels, 720, 440, objects);
  assert.ok(result.length > 0 && result.length < labels.length);
  assert.equal(result[0].id, "0");
  for (const label of result) {
    assert.ok(label.box.x >= 10 && label.box.y >= 10);
    assert.ok(
      label.box.x + label.box.width <= 710 &&
        label.box.y + label.box.height <= 430,
    );
    assert.ok(objects.every((object) => !overlaps(label.box, object)));
    assert.ok(
      result
        .filter((other) => other !== label)
        .every((other) => !overlaps(label.box, other.box)),
    );
  }
  assert.equal(labels.length, 12, "layout cannot mutate its inputs");
});

test("real architecture labels remain readable during rotation and viewport changes", () => {
  for (const [width, height, pitch] of [
    [1800, 750, 0.15],
    [1260, 660, 0.48],
    [720, 390, 0.48],
  ]) {
    const viewport = viewportCamera(width, height);
    const camera = {
      ...defaultOrbit,
      pitch,
      distance: 1670,
      target: { x: -40, y: 60, z: 70 },
      center: { x: width * 0.64, y: height * 0.52 },
      focal: viewport.focal,
    };
    const objects = worldNodes.map((node) => {
      const pos = spatialPosition(node.id);
      const q = project(pos, camera);
      const top = project({ ...pos, y: pos.y + 65 }, camera);
      return { node, q, top };
    });
    const obstacles = objects.map(({ q, top }) => ({
      x: q.x - 38 * q.scale,
      y: Math.min(q.y, top.y) - 18 * q.scale,
      width: 76 * q.scale,
      height: Math.abs(q.y - top.y) + 32 * q.scale,
    }));
    const result = placeLabels(
      objects.map(({ node, q, top }) => ({
        id: node.id,
        text: node.label,
        color: "white",
        x: q.x,
        y: q.y,
        above: Math.min(q.y, top.y) - 18 * q.scale,
        priority: 60,
      })),
      width,
      height,
      obstacles,
    );
    assert.ok(result.length >= (width > 1000 ? 10 : 4));
    for (const label of result)
      for (const other of result)
        if (label !== other)
          assert.equal(overlaps(label.box, other.box), false);
  }
});
