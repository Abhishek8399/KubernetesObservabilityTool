import test from "node:test";
import assert from "node:assert/strict";
import {
  readyBackends,
  scenarios,
  simulate,
  zoneReadyCounts,
} from "./simulation.ts";
test("a failed endpoint cannot continue to count as a ready backend", () => {
  assert.equal(simulate("pod-failure", 0, false).ready, 5);
  assert.equal(simulate("pod-failure", 6, false).ready, 6);
});
test("replica demand cannot bypass missing compute capacity", () => {
  const waiting = simulate("traffic-spike", 5, false);
  assert.equal(waiting.desired, 12);
  assert.equal(waiting.ready, 9);
  assert.equal(waiting.pending, 3);
  const recovered = simulate("traffic-spike", 12, false);
  assert.equal(recovered.nodes, 4);
  assert.equal(recovered.ready, 12);
  assert.equal(recovered.pending, 0);
});
test("regional failure never activates an unconfigured standby", () => {
  assert.equal(readyBackends(simulate("region-failure", 100, false)), 0);
  assert.equal(simulate("region-failure", 100, false).secondaryActive, false);
  assert.equal(readyBackends(simulate("region-failure", 5, true)), 0);
  assert.equal(readyBackends(simulate("region-failure", 12, true)), 6);
});
test("healthy Pod counts do not conceal policy or dependency failure", () => {
  for (const id of ["policy-block", "dependency-outage"] as const) {
    const s = simulate(id, 3, false);
    assert.equal(s.ready, 6);
    assert.equal(readyBackends(s), 0);
  }
});
test("every scenario remains bounded at phase transitions and invalid time inputs", () => {
  for (const scenario of scenarios) {
    for (const time of [-1, 0, 4, 5, 8, 9, 10, 12, Infinity, NaN]) {
      const s = simulate(scenario.id, time, true);
      assert.ok(s.ready >= 0 && s.ready <= s.desired);
      assert.ok(s.pending >= 0);
      assert.ok(s.nodes >= 0);
    }
  }
});

test("visible primary Pods match totals and never occupy a failed zone", () => {
  for (const scenario of scenarios) {
    for (const time of [0, 4, 5, 8, 9, 10, 12]) {
      const s = simulate(scenario.id, time, true);
      const placement = zoneReadyCounts(s);
      assert.equal(
        placement.reduce((sum, ready) => sum + ready, 0),
        s.ready,
      );
      if (s.failedZone !== null) assert.equal(placement[s.failedZone], 0);
      if (s.nodes === 0) assert.deepEqual(placement, [0, 0, 0]);
      assert.ok(placement.every((count) => count >= 0 && count <= 4));
    }
  }
});
