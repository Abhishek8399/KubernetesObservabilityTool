import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceLab,
  labFrame,
  visiblePods,
  labDuration,
  chapterTimes,
} from "./lab.ts";
import { scenarios, readyBackends } from "./simulation.ts";
test("playback is bounded, replayable, and gives each chapter a visible interval", () => {
  assert.equal(advanceLab(27.8, 0.5), labDuration);
  assert.equal(advanceLab(labDuration, 1000), labDuration);
  assert.equal(advanceLab(NaN, Infinity), 0);
  assert.equal(labFrame("pod-failure", 4, false).simulation.ready, 5);
  assert.equal(labFrame("pod-failure", 11.9, false).index, 1);
  assert.equal(labFrame("pod-failure", 12, false).index, 2);
  assert.equal(labFrame("pod-failure", 28, false).complete, true);
  assert.equal(labFrame("pod-failure", 4, false).complete, false);
});
test("rendered Pod identities and states match ready counts at every chapter", () => {
  for (const { id } of scenarios)
    for (const time of chapterTimes) {
      const f = labFrame(id, time, true),
        pods = [0, 1, 2].flatMap((zone) => visiblePods(id, f, zone));
      assert.equal(
        pods.filter((p) => p.state === "ready").length,
        f.simulation.ready,
        `${id} at ${time}`,
      );
      assert.equal(new Set(pods.map((p) => p.id)).size, pods.length);
      if (f.simulation.failedZone !== null)
        assert.ok(
          visiblePods(id, f, f.simulation.failedZone).every(
            (p) => p.state === "offline",
          ),
        );
    }
});
test("Pod loss and replacement are different visible states, not just a timer", () => {
  assert.equal(
    visiblePods("pod-failure", labFrame("pod-failure", 4, false), 2)[1].state,
    "lost",
  );
  assert.equal(
    visiblePods("pod-failure", labFrame("pod-failure", 12, false), 2)[1].state,
    "starting",
  );
  const replacement = visiblePods(
    "pod-failure",
    labFrame("pod-failure", 22, false),
    2,
  )[1];
  assert.equal(replacement.state, "ready");
  assert.equal(replacement.replacement, true);
});
test("external and policy outages wait for an explicit operator repair", () => {
  for (const id of ["dependency-outage", "policy-block"] as const) {
    const unresolved = labFrame(id, 28, false),
      restored = labFrame(id, 22, false, true);
    assert.equal(readyBackends(unresolved.simulation), 0);
    assert.ok(unresolved.repairLabel);
    assert.equal(restored.simulation.ready, 6);
    assert.equal(readyBackends(restored.simulation), 6);
    assert.equal(restored.repairLabel, null);
  }
});
test("standby can serve after promotion while primary capacity stays zero", () => {
  assert.equal(
    readyBackends(labFrame("region-failure", 12, true).simulation),
    0,
  );
  const recovered = labFrame("region-failure", 22, true).simulation;
  assert.equal(recovered.ready, 0);
  assert.equal(readyBackends(recovered), 6);
  assert.equal(
    readyBackends(labFrame("region-failure", 28, false).simulation),
    0,
  );
});
