export type Scenario =
  | "healthy"
  | "pod-failure"
  | "zone-failure"
  | "traffic-spike"
  | "rollout"
  | "region-failure"
  | "dependency-outage"
  | "policy-block";
export interface Simulation {
  desired: number;
  ready: number;
  pending: number;
  nodes: number;
  failedZone: number | null;
  failedPod: boolean;
  secondaryActive: boolean;
  serviceAvailable: boolean;
  phase: string;
  events: string[];
}
export const scenarios: { id: Scenario; title: string; detail: string }[] = [
  {
    id: "healthy",
    title: "Healthy system",
    detail: "A steady baseline with six ready application Pods.",
  },
  {
    id: "pod-failure",
    title: "Lose a Pod",
    detail: "Observe endpoint withdrawal and replica replacement.",
  },
  {
    id: "zone-failure",
    title: "Lose a zone",
    detail: "Lose one failure domain and reconcile on surviving nodes.",
  },
  {
    id: "traffic-spike",
    title: "Traffic spike",
    detail: "Separate HPA replica demand from node capacity.",
  },
  {
    id: "rollout",
    title: "Rolling release",
    detail: "Observe ready capacity while replicas change version.",
  },
  {
    id: "dependency-outage",
    title: "Dependency outage",
    detail: "The cluster can remain ready while a user request fails.",
  },
  {
    id: "policy-block",
    title: "Block network traffic",
    detail: "Ready Pods cannot bypass denied network flows.",
  },
  {
    id: "region-failure",
    title: "Regional failure",
    detail: "An explicitly designed standby path recovers traffic.",
  },
];
export function simulate(
  scenario: Scenario,
  elapsed: number,
  drEnabled: boolean,
): Simulation {
  const t = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  const s: Simulation = {
    desired: 6,
    ready: 6,
    pending: 0,
    nodes: 3,
    failedZone: null,
    failedPod: false,
    secondaryActive: false,
    serviceAvailable: true,
    phase: "Steady state",
    events: [
      "Six ready replicas are spread across three illustrative failure domains.",
    ],
  };
  if (scenario === "pod-failure") {
    s.failedPod = t < 5;
    s.ready = t < 5 ? 5 : 6;
    s.phase = t < 5 ? "Replica replacement" : "Replica restored";
    s.events = [
      "One Pod is lost; its endpoint is removed.",
      "The ReplicaSet controller maintains desired replica count.",
      t < 5
        ? "A replacement initializes before becoming ready."
        : "The replacement is ready and eligible for traffic.",
    ];
  }
  if (scenario === "zone-failure") {
    s.failedZone = 1;
    s.nodes = 2;
    s.ready = t < 8 ? 4 : 6;
    s.phase = t < 8 ? "Recover on surviving nodes" : "Capacity recovered";
    s.events = [
      "Illustrative zone B is unavailable: two replicas are lost.",
      "Recovery requires suitable capacity on surviving nodes.",
      t < 8
        ? "Controllers reconcile and replacement Pods initialize."
        : "Two replacement Pods are ready on surviving nodes.",
    ];
  }
  if (scenario === "traffic-spike") {
    s.desired = 12;
    s.nodes = t < 9 ? 3 : 4;
    s.ready = t < 4 ? 6 : t < 9 ? 9 : 12;
    s.pending = t < 4 ? 6 : t < 9 ? 3 : 0;
    s.phase =
      t < 4
        ? "HPA requests replicas"
        : t < 9
          ? "Compute capacity needed"
          : "Capacity catches up";
    s.events = [
      "Configured metrics cause HPA to request twelve replicas.",
      "The illustrative pool initially fits nine replicas.",
      t < 9
        ? "Additional replicas need another eligible node."
        : "An additional node becomes available; new Pods are ready.",
    ];
  }
  if (scenario === "rollout") {
    s.desired = 6;
    s.ready = 6;
    s.phase = t < 9 ? "Old and new versions overlap" : "Release complete";
    s.events = [
      "The example permits one surge replica and zero unavailable replicas.",
      "Readiness gates each new replica before an old one is removed.",
      "This requires spare capacity and compatible application behavior.",
    ];
  }
  if (scenario === "dependency-outage") {
    s.serviceAvailable = false;
    s.phase = "Dependency unavailable";
    s.events = [
      "The external data service is unavailable.",
      "Application Pods may still be Running and pass basic readiness.",
      "A user-visible SLI detects failures; restarting every Pod is not a database repair.",
    ];
  }
  if (scenario === "policy-block") {
    s.serviceAvailable = false;
    s.phase = "Traffic denied";
    s.events = [
      "The example policy denies a required application flow.",
      "Pods remain ready but connectivity is unavailable.",
      "Inspect policy selectors, DNS access, and required dependency paths.",
    ];
  }
  if (scenario === "region-failure") {
    s.ready = 0;
    s.nodes = 0;
    s.serviceAvailable = drEnabled && t >= 10;
    s.secondaryActive = drEnabled && t >= 10;
    s.phase = !drEnabled
      ? "No regional recovery configured"
      : t < 10
        ? "Standby promotion pending"
        : "Standby serving";
    s.events = [
      "The primary cluster is unavailable.",
      drEnabled
        ? "The example standby has separately provisioned capacity and a compatible data recovery plan."
        : "Single-region Kubernetes does not create a second cluster or failover plan.",
      s.secondaryActive
        ? "Illustrative external routing switches after health and data checks."
        : "Actual recovery time depends on detection, routing caches, capacity, and data readiness.",
    ];
  }
  return s;
}
export function readyBackends(s: Simulation): number {
  return s.serviceAvailable ? (s.secondaryActive ? 6 : s.ready) : 0;
}
