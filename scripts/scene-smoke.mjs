import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({
  configFile: "vite.static.config.ts",
  server: { middlewareMode: true, hmr: false, watch: null },
  appType: "custom",
  logLevel: "error",
});
const diagnostics = [];
const originalError = console.error;
console.error = (...args) => {
  const message = args.map(String).join(" ");
  // The local Node 26 loader warning is not a React rendering diagnostic.
  if (message.includes("[DEP0205]") && message.includes("module.register()")) {
    originalError(...args);
    return;
  }
  diagnostics.push(message);
};
try {
  const { default: Scene } = await vite.ssrLoadModule(
    "/app/architecture-scene.tsx",
  );
  const { labFrame } = await vite.ssrLoadModule("/app/lib/lab.ts");
  const render = (scenario, time, recovery = false, resolved = false) => {
    const lab = labFrame(scenario, time, recovery, resolved);
    return renderToStaticMarkup(
      React.createElement(Scene, {
        scenario,
        simulation: lab.simulation,
        lab,
        highlights: lab.chapter.focus,
        selected: null,
        focus: null,
        layer: "all",
        motion: false,
        recovery,
        camera: { x: 0, y: 0, zoom: 1 },
        onCamera() {},
        onSelect() {},
        onConnection() {},
      }),
    );
  };
  const occurrences = (text, marker) => text.split(marker).length - 1;
  const lost = render("pod-failure", 4),
    starting = render("pod-failure", 12),
    restored = render("pod-failure", 22);
  assert.match(lost, /data-pod="C2" data-pod-state="lost"/);
  assert.match(starting, /data-pod="C2" data-pod-state="starting"/);
  assert.equal(occurrences(lost, 'data-pod-state="ready"'), 5);
  assert.equal(occurrences(lost, 'data-state="serving"'), 5);
  assert.equal(occurrences(restored, 'data-pod-state="ready"'), 6);
  const zone = render("zone-failure", 4);
  assert.match(zone, /data-zone="B" data-state="offline"/);
  assert.equal(occurrences(zone, 'data-pod-state="ready"'), 4);
  assert.equal(occurrences(zone, 'data-state="serving"'), 4);
  assert.match(zone, /data-endpoint="B1" data-state="withdrawn"/);
  assert.equal(
    occurrences(render("zone-failure", 22), 'data-pod-state="ready"'),
    6,
  );
  assert.equal(
    occurrences(render("traffic-spike", 4), 'data-pod-state="pending"'),
    6,
  );
  assert.equal(
    occurrences(render("traffic-spike", 12), 'data-pod-state="pending"'),
    3,
  );
  assert.equal(
    occurrences(render("traffic-spike", 22), 'data-pod-state="ready"'),
    12,
  );
  assert.equal(occurrences(render("rollout", 22), 'data-version="v2"'), 6);
  assert.equal(
    occurrences(render("policy-block", 22), 'data-state="blocked"'),
    6,
  );
  assert.equal(
    occurrences(
      render("policy-block", 22, false, true),
      'data-state="serving"',
    ),
    6,
  );
  assert.match(
    render("dependency-outage", 4),
    /data-component="database" data-state="unavailable"/,
  );
  assert.match(
    render("dependency-outage", 22, false, true),
    /data-component="database" data-state="available"/,
  );
  assert.equal(
    occurrences(render("region-failure", 22, true), 'data-pod-state="ready"'),
    0,
  );
  assert.ok(render("region-failure", 22, true).includes("STANDBY SERVING"));
  assert.equal(
    occurrences(render("region-failure", 22, true), 'data-standby-backend="'),
    6,
  );
  assert.equal(
    occurrences(render("region-failure", 22, false), 'data-standby-backend="'),
    0,
  );
  const { default: Console } = await vite.ssrLoadModule("/app/lab-console.tsx");
  const consoleMarkup = renderToStaticMarkup(
    React.createElement(Console, {
      frame: labFrame("pod-failure", 28, false),
      scenario: "pod-failure",
      paused: false,
      speed: 0.5,
      recovery: false,
      onSeek() {},
      onReplay() {},
      onPause() {},
      onSpeed() {},
      onRepair() {},
      onRecovery() {},
      onClose() {},
      onInspect() {},
      onChoose() {},
    }),
  );
  assert.ok(consoleMarkup.includes("FINISHED"));
  assert.ok(consoleMarkup.includes("Replay any point in the lesson"));
  assert.ok(consoleMarkup.includes('value="0.5" selected=""'));
  const { default: Universe } = await vite.ssrLoadModule("/app/universe.tsx");
  const firstView = renderToStaticMarkup(React.createElement(Universe));
  assert.ok(firstView.includes("What changes when a Pod fails?"));
  assert.ok(firstView.includes("Explain connection:"));
  assert.equal(diagnostics.length, 0, diagnostics[0]?.slice(0, 250));
  console.log(
    "Rendered SVG verified: lost and starting Pod, zone outage, withdrawn routes, capacity growth, rollout versions, explicit repairs and independent standby.",
  );
} finally {
  console.error = originalError;
  await vite.close();
}
