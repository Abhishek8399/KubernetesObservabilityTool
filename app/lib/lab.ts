import {
  simulate,
  zoneReadyCounts,
  type Scenario,
  type Simulation,
} from "./simulation.ts";

export const labDuration = 28;
export const chapterTimes = [0, 4, 12, 22] as const;
export interface LabChapter {
  title: string;
  body: string;
  focus: string[];
  modelTime: number;
}
const before: LabChapter = {
  title: "Six ready Pods. Three failure domains.",
  body: "The application has six replicas, two in each illustrative zone. Ready endpoints can receive requests. These numbers describe this lesson, not a prescribed production design.",
  focus: ["pods", "service"],
  modelTime: 0,
};
export const labChapters: Record<Exclude<Scenario, "healthy">, LabChapter[]> = {
  "pod-failure": [
    before,
    {
      title: "Pod C2 is lost. Its endpoint is withdrawn.",
      body: "The red Pod in zone C no longer serves requests. Follow the remaining green routes: five replicas can still serve the application. Desired replicas remain six.",
      focus: ["pods", "service"],
      modelTime: 0,
    },
    {
      title: "Controllers replace it. Readiness gates traffic.",
      body: "The ReplicaSet controller maintains the replica count. The scheduler selects an eligible node, and its kubelet starts the replacement. The amber Pod is starting; it is not a ready endpoint yet.",
      focus: ["controllers", "scheduler", "nodes", "deployment", "pods"],
      modelTime: 2,
    },
    {
      title: "The replacement is ready. Six endpoints again.",
      body: "The new Pod passes readiness and joins the Service backends. It has a new Pod identity; the diagram marks the replacement C2′ in the same illustrative slot. Replay to compare the lost and restored states.",
      focus: ["pods", "service", "probes"],
      modelTime: 6,
    },
  ],
  "zone-failure": [
    before,
    {
      title: "Zone B disappears. Two replicas are lost.",
      body: "The entire middle worker platform is red and offline. Its ready endpoints disappear. Four replicas on zones A and C continue serving; the requested replica count stays six.",
      focus: ["nodes", "pods", "service"],
      modelTime: 0,
    },
    {
      title: "Place replacements on surviving capacity.",
      body: "The assumed failure has been detected and Pod replacement is permitted. Amber replacement Pods start on zones A and C. This requires spare capacity, eligible topology constraints, and a viable data path; actual node-loss detection and eviction take longer.",
      focus: ["controllers", "scheduler", "nodes", "pods"],
      modelTime: 4,
    },
    {
      title: "Replicas recover. The failed zone stays offline.",
      body: "Zones A and C now have three ready replicas each. Zone B has not healed. Kubernetes reconciles workloads; it does not repair the failed infrastructure. The lesson assumes the surviving nodes can fit the replacements.",
      focus: ["pods", "service", "affinity"],
      modelTime: 9,
    },
  ],
  "traffic-spike": [
    before,
    {
      title: "Demand doubles. HPA asks for twelve replicas.",
      body: "The green demand signal is a configured metrics response. Amber slots show the requested Pods that cannot all run yet. Asking for replicas does not create compute capacity.",
      focus: ["hpa", "deployment", "pods"],
      modelTime: 0,
    },
    {
      title: "Nine are ready. Three are waiting for capacity.",
      body: "Eligible nodes initially fit nine replicas. The amber Pending Pods still cannot receive traffic. A configured infrastructure autoscaler must provide another eligible node; HPA alone cannot do it.",
      focus: ["hpa", "nodes", "autoscaler", "pods"],
      modelTime: 5,
    },
    {
      title: "A new node joins. All twelve replicas are ready.",
      body: "The added node is visible beside the worker pool. There are now four illustrative nodes across three failure domains. Twelve ready Pods can serve requests after scheduling and startup complete.",
      focus: ["nodes", "pods", "service"],
      modelTime: 12,
    },
  ],
  rollout: [
    before,
    {
      title: "Version 2 starts alongside version 1.",
      body: "One amber version-2 surge Pod starts while all six version-1 replicas remain ready. The example uses one surge and zero unavailable replicas; it assumes enough spare capacity and an application that supports overlap.",
      focus: ["deployment", "pods", "probes"],
      modelTime: 0,
    },
    {
      title: "Readiness permits replacement, one batch at a time.",
      body: "Green version-2 cubes replace blue version-1 cubes as new replicas become ready. The Service selects ready endpoints. It does not choose application versions; separate routing is needed for a traffic-based canary.",
      focus: ["deployment", "pods", "service"],
      modelTime: 5,
    },
    {
      title: "Version 2 is serving. The rollout is complete.",
      body: "All six displayed replicas are version 2. Ready capacity stayed available in this illustrative rollout. That result depends on probes, rollout configuration, capacity, and application compatibility.",
      focus: ["deployment", "pods", "service"],
      modelTime: 12,
    },
  ],
  "dependency-outage": [
    before,
    {
      title: "The database boundary fails. Pods stay ready.",
      body: "The database turns red and its request connection breaks. Green client-to-Pod routes can still work. Six Running or ready Pods are not proof that a full user request succeeds.",
      focus: ["database", "pods", "observability"],
      modelTime: 0,
    },
    {
      title: "Trace the failing dependency, not the replica count.",
      body: "Use request errors, traces, connection errors, and dependency health to find the boundary. Restarting healthy Pods does not restore the database. In this lesson the configured readiness checks do not cover that dependency.",
      focus: ["database", "observability", "slo"],
      modelTime: 3,
    },
    {
      title: "Waiting for a dependency repair.",
      body: "There is no automatic Kubernetes repair for this external database in the lesson. Use “Restore dependency” below to perform an explicit simulated operator action, then watch the data path return.",
      focus: ["database", "observability"],
      modelTime: 12,
    },
  ],
  "policy-block": [
    before,
    {
      title: "A policy denies the required application flow.",
      body: "The Service-to-Pod route shows a red block. The policy engine is working, not crashed. The database and six application replicas stay healthy, but the required connection is denied.",
      focus: ["networkpolicy", "service", "pods"],
      modelTime: 0,
    },
    {
      title: "Inspect selectors and required access.",
      body: "Compare the allowed source, selected destination Pods, ports, protocol, and DNS requirements. For this lesson the denied boundary is the gateway/Service path to application Pods. Enforcement depends on the network implementation.",
      focus: ["networkpolicy", "cni", "gateway"],
      modelTime: 3,
    },
    {
      title: "Waiting for the intended access rule.",
      body: "A healthy cluster will not bypass a deny rule. Use “Allow required flow” to simulate a reviewed policy correction. Only the denied path changes; the database does not need to be repaired.",
      focus: ["networkpolicy", "service"],
      modelTime: 12,
    },
  ],
  "region-failure": [
    before,
    {
      title: "The primary cluster is unavailable.",
      body: "Control-plane and worker platforms are marked offline. Primary serving capacity is zero. A separate region cannot appear automatically; the standby toggle models a deliberately provisioned recovery design.",
      focus: ["nodes", "api", "dr"],
      modelTime: 0,
    },
    {
      title: "Check standby capacity, data, and external routing.",
      body: "With standby configured, health and data checks precede routing promotion. Without standby, the application remains unavailable. Real RTO and RPO depend on detection, data recovery, DNS caches, and infrastructure readiness.",
      focus: ["dr", "dns", "loadbalancer"],
      modelTime: 5,
    },
    {
      title: "Inspect the recovery outcome.",
      body: "A configured standby now has six serving backends; the primary is still down. Without a separately designed standby the result remains zero serving backends. Kubernetes does not replicate clusters or recover application data by itself.",
      focus: ["dr", "loadbalancer"],
      modelTime: 12,
    },
  ],
};
export interface LabFrame {
  learning?: {
    step: number;
    desired: number;
    ready: number;
    serviceAvailable: boolean;
  };
  index: number;
  chapter: LabChapter;
  simulation: Simulation;
  complete: boolean;
  time: number;
  repairLabel: string | null;
  resolved: boolean;
}
export function boundedLabTime(time: number): number {
  return Number.isFinite(time) ? Math.max(0, Math.min(labDuration, time)) : 0;
}
export function advanceLab(time: number, delta: number): number {
  return boundedLabTime(
    boundedLabTime(time) + (Number.isFinite(delta) ? Math.max(0, delta) : 0),
  );
}
export function labFrame(
  scenario: Scenario,
  time: number,
  recovery: boolean,
  resolved = false,
): LabFrame {
  const t = boundedLabTime(time),
    index =
      scenario === "healthy"
        ? 0
        : chapterTimes.reduce<number>(
            (current, at, i) => (t >= at ? i : current),
            0,
          );
  const chapter =
    scenario === "healthy" ? before : labChapters[scenario][index];
  const canRepair =
    scenario === "dependency-outage" || scenario === "policy-block";
  let simulation = simulate(
    index === 0 || scenario === "healthy" ? "healthy" : scenario,
    chapter.modelTime,
    recovery,
  );
  if (index > 0 && scenario === "pod-failure" && index < 3)
    simulation = { ...simulation, pending: 1 };
  if (index === 1 && scenario === "rollout")
    simulation = { ...simulation, pending: 1 };
  if (canRepair && resolved) {
    simulation = simulate("healthy", 0, false);
    simulation.phase =
      scenario === "policy-block"
        ? "Required flow allowed"
        : "Dependency restored";
  }
  return {
    index,
    chapter:
      canRepair && resolved
        ? {
            ...chapter,
            title: simulation.phase,
            body:
              scenario === "policy-block"
                ? "The reviewed simulated rule now allows the intended flow. Ready replicas and the database were healthy throughout; request connectivity returns without restarting them."
                : "The simulated dependency is restored. The Pod-to-database request path returns. No application replicas needed to be restarted.",
            focus:
              scenario === "policy-block"
                ? ["networkpolicy", "service", "pods"]
                : ["database", "pods"],
            modelTime: chapter.modelTime,
          }
        : chapter,
    simulation,
    complete: t === labDuration,
    time: t,
    repairLabel:
      canRepair && !resolved && index > 0
        ? scenario === "policy-block"
          ? "Allow required flow"
          : "Restore dependency"
        : null,
    resolved,
  };
}
export type PodState = "ready" | "lost" | "starting" | "pending" | "offline";
export interface PodVisual {
  id: string;
  slot: number;
  state: PodState;
  version: "v1" | "v2";
  replacement: boolean;
}
export function visiblePods(
  scenario: Scenario,
  frame: LabFrame,
  zone: number,
): PodVisual[] {
  const s = frame.simulation,
    count = zoneReadyCounts(s)[zone],
    offline = s.nodes === 0 || s.failedZone === zone;
  if (frame.learning) {
    const capacity = Math.floor(s.desired / 3) + (zone < s.desired % 3 ? 1 : 0);
    return Array.from({ length: capacity }, (_, slot) => ({
      id: `${String.fromCharCode(65 + zone)}${slot + 1}`,
      slot,
      state: slot < count ? "ready" : "starting",
      version: "v1",
      replacement: false,
    }));
  }
  const capacity =
    scenario === "traffic-spike" && frame.index > 0
      ? 4
      : scenario === "zone-failure" && frame.index >= 2 && !offline
        ? 3
        : scenario === "rollout" && frame.index === 1 && zone === 2
          ? 3
          : Math.max(count, 2);
  return Array.from({ length: capacity }, (_, slot) => {
    const replacing =
      (scenario === "pod-failure" &&
        zone === 2 &&
        slot === 1 &&
        frame.index >= 2) ||
      (scenario === "zone-failure" && slot === 2);
    const state: PodState = offline
      ? "offline"
      : slot < count
        ? "ready"
        : scenario === "pod-failure" && frame.index === 1
          ? "lost"
          : scenario === "traffic-spike"
            ? "pending"
            : "starting";
    const version =
      scenario === "rollout" &&
      (frame.index === 3 ||
        (frame.index === 2 && slot === 0) ||
        (frame.index === 1 && slot === 2))
        ? "v2"
        : "v1";
    return {
      id: `${String.fromCharCode(65 + zone)}${slot + 1}`,
      slot,
      state,
      version,
      replacement: replacing,
    };
  });
}
