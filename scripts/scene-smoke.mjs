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
  const { flightMission, resourceAnchor, flightPose } =
    await vite.ssrLoadModule("/app/lib/flight.ts");
  const { default: Deck } = await vite.ssrLoadModule("/app/flight-deck.tsx");
  const { default: Spatial } = await vite.ssrLoadModule(
    "/app/spatial-scene.tsx",
  );
  const { FlightCraft } = await vite.ssrLoadModule(
    "/app/architecture-scene.tsx",
  );
  const { applicationFrame } = await vite.ssrLoadModule("/app/lib/learning.ts");
  const { labFrame } = await vite.ssrLoadModule("/app/lib/lab.ts");
  const render = (scenario, time, recovery = false, resolved = false) => {
    const lab =
      scenario === "application"
        ? applicationFrame(time)
        : labFrame(scenario, time, recovery, resolved);
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
  const renderSpatial = (
    scenario,
    time,
    recovery = false,
    resolved = false,
    flight,
  ) => {
    const lab =
      scenario === "application"
        ? applicationFrame(time)
        : labFrame(scenario, time, recovery, resolved);
    return renderToStaticMarkup(
      React.createElement(Spatial, {
        scenario: scenario === "application" ? "healthy" : scenario,
        simulation: lab.simulation,
        lab,
        highlights: [],
        selected: null,
        focus: null,
        layer: "all",
        motion: false,
        recovery,
        camera: { x: 0, y: 0, zoom: 1 },
        onCamera() {},
        onSelect() {},
        onConnection() {},
        flight,
      }),
    );
  };
  for (const [step, count] of [
    [0, 0],
    [5, 2],
    [8, 2],
    [10, 4],
    [31, 4],
  ]) {
    const svg = renderSpatial("application", step);
    assert.equal(occurrences(svg, 'data-spatial-resource="pods"'), count);
    assert.equal(occurrences(svg, 'data-spatial-plane="'), 8);
    assert.ok(!svg.includes("NaN") && !svg.includes("Infinity"));
  }
  assert.equal(
    occurrences(renderSpatial("application", 8), 'data-spatial-endpoint="'),
    0,
  );
  const connected = renderSpatial("application", 10);
  assert.equal(occurrences(connected, 'data-service-owner="api"'), 2);
  assert.equal(occurrences(connected, 'data-service-owner="frontend"'), 2);
  assert.match(
    renderSpatial("pod-failure", 4),
    /data-spatial-resource="pods"[^>]*data-state="lost"/,
  );
  assert.match(
    renderSpatial("pod-failure", 12),
    /data-spatial-resource="pods"[^>]*data-state="starting"/,
  );
  assert.equal(
    occurrences(renderSpatial("pod-failure", 4), 'data-spatial-endpoint="'),
    5,
  );
  assert.equal(
    occurrences(renderSpatial("pod-failure", 28), 'data-spatial-endpoint="'),
    6,
  );
  assert.match(
    renderSpatial("zone-failure", 4),
    /data-spatial-resource="node-b"[^>]*data-state="offline"/,
  );
  assert.ok(renderSpatial("traffic-spike", 28).includes("ADDED NODE 4"));
  assert.ok(!renderSpatial("region-failure", 28, false).includes("STANDBY 1"));
  assert.ok(renderSpatial("region-failure", 28, true).includes("STANDBY 6"));
  assert.equal(occurrences(render("application", 0), 'data-pod="'), 0);
  assert.equal(
    occurrences(render("application", 5), 'data-pod-state="starting"'),
    2,
  );
  assert.equal(
    occurrences(render("application", 8), 'data-state="serving"'),
    0,
  );
  assert.equal(
    occurrences(render("application", 9), 'data-state="serving"'),
    2,
  );
  assert.equal(
    occurrences(render("application", 10), 'data-pod-state="ready"'),
    4,
  );
  assert.match(
    render("application", 0),
    /data-provisioning="planned" data-component="deployment"/,
  );
  const splitServices = render("application", 10);
  assert.equal(occurrences(splitServices, 'data-service-owner="api"'), 2);
  assert.equal(occurrences(splitServices, 'data-service-owner="frontend"'), 2);
  assert.ok(splitServices.includes("FRONTEND SERVICE"));
  assert.ok(!splitServices.includes('data-course-route="frontend"'));
  assert.ok(render("application", 13).includes('data-course-route="frontend"'));
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
  const mission = flightMission("request");
  const stop = mission.steps.at(-1);
  const destination = resourceAnchor(stop.node);
  const pose = flightPose(
    { x: 0, y: 0, zoom: 1 },
    resourceAnchor("loadbalancer"),
    destination,
    1,
  );
  const visual = {
    ...pose,
    from: resourceAnchor("loadbalancer"),
    to: destination,
    key: "return",
  };
  const craft = renderToStaticMarkup(
    React.createElement(
      "svg",
      null,
      React.createElement(FlightCraft, {
        flight: {
          visual,
          destination,
          node: stop.node,
          phase: stop.phase,
          stopKey: "return",
        },
        onSelect() {},
      }),
    ),
  );
  assert.ok(craft.includes('data-flight-resource="clients"'));
  assert.ok(craft.includes('data-flight-progress="1"'));
  assert.ok(craft.includes("flight-return"));
  const deck = renderToStaticMarkup(
    React.createElement(Deck, {
      checked: true,
      completed: 0,
      onAnswer() {},
      onExample() {},
      onFailure() {},
      onCourse() {},
      mission,
      step: mission.steps.length - 1,
      visual,
      paused: false,
      auto: false,
      autopilot: true,
      reducedMotion: false,
      engine: "Local simulation engine",
      engineError: "",
      ready: 6,
      desired: 6,
      backends: 6,
      onStep() {},
      onPlay() {},
      onClose() {},
      onInspect() {},
      onOverview() {},
      onLab() {},
    }),
  );
  assert.ok(deck.includes("WHY THIS RESOURCE EXISTS"));
  assert.ok(deck.includes("WHAT HAPPENS AT THIS STOP"));
  assert.ok(deck.includes("Expedition complete"));
  assert.ok(deck.includes("RESPONSE RETURNS"));
  const course = flightMission("application");
  const courseDeck = renderToStaticMarkup(
    React.createElement(Deck, {
      mission: course,
      step: 3,
      visual: null,
      paused: false,
      auto: false,
      autopilot: true,
      reducedMotion: false,
      engine: "Local simulation engine",
      engineError: "",
      ready: 0,
      desired: 0,
      backends: 0,
      checked: false,
      completed: 0,
      onAnswer() {},
      onExample() {},
      onFailure() {},
      onCourse() {},
      onStep() {},
      onPlay() {},
      onClose() {},
      onInspect() {},
      onOverview() {},
      onLab() {},
    }),
  );
  assert.ok(courseDeck.includes("Check understanding"));
  assert.ok(courseDeck.includes("Should I create a Pod or a Deployment?"));
  assert.ok(courseDeck.includes("What if I skip this"));
  assert.ok(courseDeck.includes("Application journey chapters"));
  assert.ok(courseDeck.includes("Example YAML"));
  assert.ok(courseDeck.includes("Maintain") || courseDeck.includes("maintain"));
  assert.match(courseDeck, /class="flight-play" disabled=""/);
  const { default: Universe } = await vite.ssrLoadModule("/app/universe.tsx");
  const firstView = renderToStaticMarkup(React.createElement(Universe));
  assert.ok(firstView.includes("What changes when a Pod fails?"));
  assert.ok(firstView.includes("Explain connection:"));
  assert.ok(firstView.includes("Background soundtrack volume"));
  assert.ok(firstView.includes("71-stop expedition"));
  assert.ok(firstView.includes("Rotate architecture"));
  assert.ok(firstView.includes("Separate architecture layers"));
  assert.ok(firstView.includes("Diagram only"));
  assert.ok(firstView.includes("Hide labels"));
  assert.ok(firstView.includes("Pan left"));
  assert.ok(firstView.includes("Focus API SERVER"));
  assert.ok(firstView.includes('class="spatial-nameplate"'));
  assert.ok(!firstView.includes('class="spatial-sub"'));
  assert.equal(occurrences(firstView, 'aria-label="Zoom out"'), 1);
  assert.equal(occurrences(firstView, 'aria-label="Reset camera"'), 1);
  assert.ok(courseDeck.includes("Focus this stage"));
  assert.ok(courseDeck.includes("Watch this stage"));
  assert.ok(courseDeck.includes('id="visible-flight-stop"'));
  assert.equal(diagnostics.length, 0, diagnostics[0]?.slice(0, 250));
  console.log(
    "Rendered SVG verified: lost and starting Pod, zone outage, withdrawn routes, capacity growth, rollout versions, explicit repairs and independent standby.",
  );
} finally {
  console.error = originalError;
  await vite.close();
}
