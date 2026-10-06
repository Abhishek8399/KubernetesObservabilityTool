import test from "node:test";
import assert from "node:assert/strict";
import { applicationCourse } from "../data/application-course.ts";
import { conceptById } from "../data/concepts.ts";
import { applicationFrame, parseUnderstanding } from "./learning.ts";
import { visiblePods } from "./lab.ts";
import { readyBackends } from "./simulation.ts";

test("application milestones have valid questions, solutions, and concrete sandbox evidence", () => {
  assert.equal(applicationCourse.steps.length, 20);
  for (const s of applicationCourse.steps) {
    assert.ok(conceptById[s.node]);
    const q = s.lesson!;
    assert.ok(q.question && q.explanation && q.exercise && q.verify);
    assert.equal(q.choices.length, 3);
    assert.ok(q.answer >= 0 && q.answer < q.choices.length);
  }
  const order = applicationCourse.steps.map((s) => s.node);
  assert.ok(order.indexOf("deployment") < order.indexOf("controllers"));
  assert.ok(order.indexOf("controllers") < order.indexOf("kubelet"));
  assert.ok(order.indexOf("probes") < order.indexOf("service"));
});
test("the learning scene cannot depict application Pods or serving endpoints before their creation", () => {
  const pods = (step: number) =>
    [0, 1, 2].flatMap((z) => visiblePods("healthy", applicationFrame(step), z));
  assert.equal(pods(0).length, 0);
  assert.equal(pods(4).length, 0);
  assert.equal(pods(5).length, 2);
  assert.ok(pods(5).every((p) => p.state === "starting"));
  assert.equal(applicationFrame(8).simulation.ready, 2);
  assert.equal(
    readyBackends(applicationFrame(8).simulation),
    0,
    "readiness alone cannot invent a Service",
  );
  assert.equal(readyBackends(applicationFrame(9).simulation), 2);
  assert.equal(pods(10).filter((p) => p.state === "ready").length, 4);
});
test("stored understanding progress rejects malformed data and unrelated entries", () => {
  assert.deepEqual(
    parseUnderstanding(
      '{"application:3":1,"secret":"ignored","application:4":99}',
    ),
    { "application:3": 1 },
  );
  for (const value of ["not json", "[]", "null", "x".repeat(9000)])
    assert.deepEqual(parseUnderstanding(value), {});
});
