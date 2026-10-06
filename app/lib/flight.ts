import { conceptById, concepts, layers } from "../data/concepts.ts";
import { journeys } from "../data/journeys.ts";
import { worldNodes } from "../data/world.ts";
import type { Scenario } from "./simulation.ts";
import { applicationCourse } from "../data/application-course.ts";

export interface Point {
  x: number;
  y: number;
}
export interface FlightCamera extends Point {
  zoom: number;
}
export type FlightPhase =
  | "Outbound request"
  | "Response returns"
  | "Discovery"
  | "Control loop"
  | "Resource tour"
  | "Failure response";
export interface FlightStop {
  node: string;
  title: string;
  body: string;
  phase: FlightPhase;
  anchor?: Point;
  time?: number;
  lesson?: {
    question: string;
    choices: string[];
    answer: number;
    explanation: string;
    exercise: string;
    verify: string;
    story?: {
      chapter: string;
      question: string;
      answer: string;
      without: string;
      create: string;
      observe: string;
      next: string;
      manifest?: string;
    };
  };
}
export interface FlightMission {
  id: string;
  title: string;
  label: string;
  steps: FlightStop[];
}
// Related API objects are shown at their logical owner, not as physical servers.
const owners: Record<string, string> = {
  cdn: "waf",
  helm: "gitops",
  cloudcontroller: "controllers",
  admission: "api",
  crd: "api",
  nodes: "node-b",
  kubelet: "node-c",
  runtime: "node-c",
  pools: "node-b",
  taints: "scheduler",
  affinity: "scheduler",
  namespace: "deployment",
  pods: "pod-c2",
  init: "pod-c2",
  daemonset: "node-b",
  statefulset: "pvc",
  jobs: "deployment",
  resources: "pod-c2",
  ingress: "gateway",
  servicetypes: "service",
  dataplane: "cni",
  mesh: "cni",
  configmap: "pod-c2",
  secrets: "rbac",
  serviceaccount: "rbac",
  podsecurity: "rbac",
  supplychain: "registry",
  policy: "rbac",
  csi: "pvc",
  cache: "database",
  objectstore: "pvc",
  vpa: "hpa",
  keda: "hpa",
  autoscaler: "node-b",
  probes: "pod-c2",
  pdb: "deployment",
  rollout: "deployment",
  prometheus: "observability",
  slo: "observability",
  backup: "pvc",
  upgrade: "node-b",
  multicluster: "dr",
  rto: "dr",
  cost: "hpa",
  tls: "gateway",
  ephemeral: "pod-c2",
  debug: "pod-c2",
};
const points: Record<string, Point> = Object.fromEntries(
  worldNodes.map((n) => [n.id, { x: n.x, y: n.y - 42 }]),
);
points["pod-c2"] = { x: 1468, y: 806 };
points["pod-b1"] = { x: 1116, y: 806 };
points["node-b"] = { x: 1044, y: 795 };
points["node-c"] = { x: 1334, y: 795 };

export function resourceAnchor(id: string): Point {
  const point = points[id] ?? points[owners[id]];
  if (!point) throw new Error(`No flight destination for resource: ${id}`);
  return point;
}
export function isLogicalStop(id: string) {
  return !worldNodes.some((n) => n.id === id) && id !== "pods";
}
export function focusedCamera(point: Point, zoom = 2.65): FlightCamera {
  return {
    x: (900 - point.x) * zoom,
    y: 520 - 580 + (580 - point.y) * zoom,
    zoom,
  };
}
export function screenPoint(point: Point, camera: FlightCamera): Point {
  return {
    x: camera.x + 900 + (point.x - 900) * camera.zoom,
    y: camera.y + 580 + (point.y - 580) * camera.zoom,
  };
}
export function panCamera(camera: FlightCamera, delta: Point): FlightCamera {
  if (!Number.isFinite(delta.x) || !Number.isFinite(delta.y)) return camera;
  // Cinematic close-ups extend beyond the old overview limits. Keep drag relative
  // to the current view; the overview button always provides a way home.
  return { ...camera, x: camera.x + delta.x, y: camera.y + delta.y };
}
export function boundedProgress(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}
const ease = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
function cameraMix(a: FlightCamera, b: FlightCamera, t: number): FlightCamera {
  return {
    x: mix(a.x, b.x, t),
    y: mix(a.y, b.y, t),
    zoom: mix(a.zoom, b.zoom, t),
  };
}
export function flightPoint(from: Point, to: Point, progress: number): Point {
  const t = boundedProgress(progress);
  // A curved course makes direction visible without claiming an exact packet topology.
  return {
    x: mix(from.x, to.x, t),
    y:
      mix(from.y, to.y, t) -
      Math.sin(Math.PI * t) *
        Math.min(110, Math.hypot(to.x - from.x, to.y - from.y) * 0.18),
  };
}
export function flightPose(
  fromCamera: FlightCamera,
  from: Point,
  to: Point,
  progress: number,
) {
  const t = boundedProgress(progress);
  const transit = ease(boundedProgress((t - 0.2) / 0.5));
  const ship = flightPoint(from, to, transit);
  const departure = focusedCamera(from, 1.15);
  const arrival = focusedCamera(to, 2.65);
  const camera =
    t < 0.2
      ? cameraMix(fromCamera, departure, ease(t / 0.2))
      : t < 0.7
        ? focusedCamera(ship, 1.15)
        : cameraMix(focusedCamera(to, 1.15), arrival, ease((t - 0.7) / 0.3));
  const after = flightPoint(from, to, Math.min(1, transit + 0.01));
  const before = flightPoint(from, to, Math.max(0, transit - 0.01));
  const angle =
    (Math.atan2(after.y - before.y, after.x - before.x) * 180) / Math.PI;
  return {
    camera,
    ship,
    angle,
    travelProgress: transit,
    progress: t,
    phase:
      t < 0.2
        ? "Departing"
        : t < 0.7
          ? "In transit"
          : t < 1
            ? "Approaching"
            : "At destination",
  };
}

const request: FlightMission = {
  id: "request",
  title: "Fly with a request",
  label: "REQUEST / ROUND TRIP",
  steps: [
    ...journeys[0].steps.map((s) => ({
      ...s,
      phase: (s.node === "dns"
        ? "Discovery"
        : "Outbound request") as FlightPhase,
    })),
    {
      node: "database",
      phase: "Response returns",
      title: "The dependency returns its result",
      body: "The database replies on the application connection. This is an optional application dependency, not part of Kubernetes request routing.",
    },
    {
      node: "pods",
      phase: "Response returns",
      title: "The application builds the response",
      body: "The container processes the result and writes an HTTP response. Readiness allows new traffic; it does not guarantee every business operation succeeds.",
    },
    {
      node: "gateway",
      phase: "Response returns",
      title: "The gateway returns the upstream response",
      body: "In this proxy-based example, the gateway forwards the response on the client connection. Service and EndpointSlice objects remain configuration, not extra proxy processes.",
    },
    {
      node: "loadbalancer",
      phase: "Response returns",
      title: "The edge connection carries the response",
      body: "Return routing depends on the implementation, including proxying, NAT, and direct server return. This course illustrates a common logical return path.",
    },
    {
      node: "clients",
      phase: "Response returns",
      title: "The client receives the result",
      body: "The round trip is complete. DNS discovered the endpoint; the API server, scheduler, and etcd were never in the application packet path.",
    },
  ],
};
const coreFlights: FlightMission[] = journeys.slice(1).map((j) => ({
  ...j,
  steps: j.steps.map((s) => ({ ...s, phase: "Control loop" })),
}));
const grandTour: FlightMission = {
  id: "grand-tour",
  title: "The complete architecture expedition",
  label: "71 RESOURCE STOPS",
  steps: layers
    .filter((l) => l.id !== "all")
    .flatMap((l) =>
      concepts
        .filter((c) => c.layer === l.id)
        .map((c) => ({
          node: c.id,
          title: c.title,
          body: c.how,
          phase: "Resource tour" as const,
        })),
    ),
};
const stop = (
  node: string,
  title: string,
  body: string,
  time: number,
  anchor?: Point,
): FlightStop => ({
  node,
  title,
  body,
  time,
  anchor,
  phase: "Failure response",
});
export function failureFlight(
  scenario: Exclude<Scenario, "healthy">,
  recovery: boolean,
  resolved: boolean,
): FlightMission {
  let steps: FlightStop[];
  switch (scenario) {
    case "pod-failure":
      steps = [
        stop(
          "pods",
          "Pod C2 is lost",
          "Look at the red cross. The workload now has five ready replicas against a desired six. This lesson models a lost Pod, not a liveness restart of the same container.",
          4,
        ),
        stop(
          "service",
          "The lost endpoint is withdrawn",
          "Follow the red dashed branch to C2. New requests can use the five remaining ready backends; the missing replica must be replaced.",
          4,
        ),
        stop(
          "controllers",
          "The ReplicaSet controller reconciles",
          "The controller observes the missing replica through API state and creates a replacement Pod. It does not route application requests.",
          12,
        ),
        stop(
          "scheduler",
          "The scheduler chooses eligible capacity",
          "The replacement is scheduled on an eligible node with enough requested resources. Binding records the node assignment through the API.",
          12,
        ),
        stop(
          "kubelet",
          "The node starts the replacement",
          "The kubelet on Node 3 uses the container runtime to start the assigned replacement. The amber Pod is starting, not yet serving.",
          12,
        ),
        stop(
          "probes",
          "Readiness gates new traffic",
          "Startup and readiness must succeed before the replacement joins ready endpoints. A replacement Pod has a new identity, even when this diagram reuses the C2 slot.",
          12,
        ),
        stop(
          "pods",
          "A replacement becomes ready",
          "C2′ is now green. There are six ready replicas again. Watch the branch return to the serving set.",
          22,
        ),
        stop(
          "service",
          "Six backends can serve again",
          "Reconciliation restored the desired replica count. The original failed Pod was not resurrected. This is accelerated educational timing.",
          28,
        ),
      ];
      break;
    case "zone-failure":
      steps = [
        stop(
          "nodes",
          "Zone B loses its node",
          "The red Zone B platform and crossed node are offline. Both local Pods are unavailable; a PDB cannot prevent this involuntary failure.",
          4,
        ),
        stop(
          "service",
          "Only four endpoints remain",
          "The two Zone B branches are withdrawn. Requests can use ready replicas in Zones A and C after failure detection and endpoint updates.",
          4,
        ),
        stop(
          "controllers",
          "Replace replicas after detection",
          "Controllers reconcile the missing replicas after node failure handling. Real detection and eviction take time; this lesson accelerates those delays.",
          12,
        ),
        stop(
          "affinity",
          "Place replacements outside the failed zone",
          "Eligible spare capacity and topology constraints determine placement. Observe the amber replacement slots in Zones A and C.",
          12,
        ),
        stop(
          "pods",
          "Replacement replicas pass readiness",
          "Six replicas now serve across the two surviving nodes. Zone B remains offline; restoring application capacity did not repair the zone.",
          22,
          { x: 1406, y: 850 },
        ),
        stop(
          "service",
          "Availability returns with less redundancy",
          "Six backends serve, but only two failure domains remain. Repair capacity and restore topology before considering the incident complete.",
          28,
        ),
      ];
      break;
    case "traffic-spike":
      steps = [
        stop(
          "hpa",
          "Demand raises desired replicas to twelve",
          "HPA requests twelve replicas. Six are ready and six are waiting; desired capacity is not serving capacity.",
          4,
        ),
        stop(
          "scheduler",
          "Requests determine eligible placement",
          "The scheduler evaluates resource requests and constraints. Waiting Pods remain visibly amber until capacity and startup are available.",
          12,
        ),
        stop(
          "autoscaler",
          "Compute scaling is a separate loop",
          "A supported node autoscaler can provision eligible compute for unschedulable Pods. Quota, provisioning delay, and implementation still matter.",
          12,
        ),
        stop(
          "probes",
          "Wait for initialized application capacity",
          "Images, startup, and readiness complete. Metrics alone cannot make a not-ready replica receive traffic.",
          12,
        ),
        stop(
          "pods",
          "Twelve replicas become ready",
          "The scene now has twelve ready Pod slots and additional compute. This model illustrates growth, not a prescribed node provisioning schedule.",
          22,
        ),
        stop(
          "service",
          "The serving set has grown",
          "All twelve ready endpoints can receive traffic. Check dependency connections, latency, and saturation before judging scaling successful.",
          28,
        ),
      ];
      break;
    case "rollout":
      steps = [
        stop(
          "deployment",
          "A changed Pod template begins a rollout",
          "A new ReplicaSet is created. The scene shows a starting v2 surge replica while the original ready replicas remain available.",
          4,
        ),
        stop(
          "probes",
          "Readiness decides whether v2 can serve",
          "A running container is not sufficient. Startup and readiness gates protect the serving set while the new version initializes.",
          12,
        ),
        stop(
          "pods",
          "Old and new versions coexist",
          "Read the v1 and v2 labels. The controller advances the rollout within its configured surge and unavailability limits.",
          12,
        ),
        stop(
          "service",
          "Ready endpoints now run v2",
          "Six ready v2 replicas remain. The example maintains availability; actual rollout safety depends on probes, configuration, dependencies, and capacity.",
          28,
        ),
      ];
      break;
    case "dependency-outage":
      steps = [
        stop(
          "database",
          "The dependency is unavailable",
          "The database is red. Pods can still be ready while user requests fail if their readiness check does not cover this dependency.",
          4,
        ),
        stop(
          "pods",
          "Application requests encounter errors",
          "Use bounded timeouts and connection pools; uncontrolled retries can amplify the outage. Restarting healthy Pods does not repair a database.",
          12,
        ),
        stop(
          "observability",
          "Identify the dependency failure",
          "Correlate request errors, traces, database health, and connection saturation. The dependency stays failed until the explicit simulated repair.",
          22,
        ),
        stop(
          "database",
          resolved
            ? "The dependency is restored"
            : "Recovery requires an explicit action",
          resolved
            ? "The simulated repair has restored the dependency. Validate successful requests as well as the Pod count."
            : "The flight ends with the dependency still unavailable. Use Restore dependency to demonstrate the recovery action; Kubernetes does not automatically heal an external database.",
          28,
        ),
      ];
      break;
    case "policy-block":
      steps = [
        stop(
          "networkpolicy",
          "Policy denies the application flow",
          "Red crosses mark blocked branches. Ready replicas alone do not imply reachability; enforcement requires a supporting network implementation.",
          4,
        ),
        stop(
          "service",
          "Discovery succeeds but traffic is blocked",
          "The endpoints are ready, yet the request path fails. Inspect ingress and egress rules, selectors, ports, and the intended source identity.",
          12,
        ),
        stop(
          "cni",
          "Verify the enforcing implementation",
          "Observe the actual policy enforcement and permitted flows. Do not remove isolation wholesale to work around a missing allow rule.",
          22,
        ),
        stop(
          "networkpolicy",
          resolved
            ? "The intended flow is permitted"
            : "Apply the narrow intended allowance",
          resolved
            ? "The simulated policy repair restores the serving branches. Verify that required traffic succeeds and unrelated isolation remains."
            : "The flow remains blocked until the explicit simulated policy repair. A controller restoring replicas cannot fix an incorrect traffic allowance.",
          28,
        ),
      ];
      break;
    case "region-failure":
      steps = [
        stop(
          "api",
          "The primary cluster is offline",
          "Control plane, worker nodes, and primary backends are unavailable. Six Pods in one region did not provide independent regional recovery.",
          4,
        ),
        stop(
          "loadbalancer",
          "Primary traffic cannot be served",
          "The edge has no healthy primary target. A separate cluster, replicated or recovered data, and traffic switching must already be designed.",
          12,
        ),
        stop(
          "dr",
          recovery
            ? "Promote the separately designed standby"
            : "There is no configured standby",
          recovery
            ? "The independent standby is now serving six backends. Primary nodes remain offline; this is a different cluster and an explicit recovery plan."
            : "No automatic second cluster appears. Enable the separately designed standby to see the difference between primary replication and regional disaster recovery.",
          22,
        ),
        stop(
          "dr",
          recovery
            ? "Validate recovery and data freshness"
            : "The outage remains unresolved",
          recovery
            ? "Standby traffic is serving. Measure restoration time and data loss against RTO/RPO; Kubernetes alone does not replicate application data across regions."
            : "The flight finishes with zero serving backends. Recovery needs independent capacity, application data recovery, and tested routing.",
          28,
        ),
      ];
      break;
  }
  return {
    id: `lab:${scenario}`,
    title: "Fly through the incident",
    label: "FAILURE / CAUSE TO RECOVERY",
    steps,
  };
}
export function flightMission(
  id: string | null,
  recovery = false,
  resolved = false,
): FlightMission | undefined {
  if (!id) return;
  if (id.startsWith("lab:")) {
    const scenario = id.slice(4);
    if (
      [
        "pod-failure",
        "zone-failure",
        "traffic-spike",
        "rollout",
        "dependency-outage",
        "policy-block",
        "region-failure",
      ].includes(scenario)
    )
      return failureFlight(
        scenario as Exclude<Scenario, "healthy">,
        recovery,
        resolved,
      );
    return;
  }
  if (id.startsWith("visit:")) {
    const c = conceptById[id.slice(6)];
    if (!c) return;
    return {
      id,
      title: `Visit ${c.title}`,
      label: "RESOURCE / CLOSE-UP",
      steps: [
        { node: c.id, title: c.title, body: c.how, phase: "Resource tour" },
      ],
    };
  }
  return [applicationCourse, request, ...coreFlights, grandTour].find(
    (j) => j.id === id,
  );
}
