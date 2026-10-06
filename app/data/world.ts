import type { Layer } from "./concepts";
import type { Scenario, Simulation } from "../lib/simulation";

export interface WorldNode {
  id: string;
  x: number;
  y: number;
  label: string;
  sub: string;
  shape: "tower" | "cube" | "database" | "portal" | "orb";
  layer: Layer;
}
export const worldNodes: WorldNode[] = [
  {
    id: "clients",
    x: 175,
    y: 560,
    label: "CLIENTS",
    sub: "The outside world",
    shape: "orb",
    layer: "edge",
  },
  {
    id: "dns",
    x: 325,
    y: 455,
    label: "DNS",
    sub: "Resolve an endpoint",
    shape: "orb",
    layer: "edge",
  },
  {
    id: "waf",
    x: 495,
    y: 430,
    label: "EDGE PROTECTION",
    sub: "Optional WAF / CDN",
    shape: "portal",
    layer: "edge",
  },
  {
    id: "loadbalancer",
    x: 505,
    y: 590,
    label: "LOAD BALANCER",
    sub: "External integration",
    shape: "portal",
    layer: "edge",
  },
  {
    id: "api",
    x: 810,
    y: 300,
    label: "API SERVER",
    sub: "The front door of control",
    shape: "tower",
    layer: "control",
  },
  {
    id: "scheduler",
    x: 985,
    y: 260,
    label: "SCHEDULER",
    sub: "Place unscheduled Pods",
    shape: "tower",
    layer: "control",
  },
  {
    id: "controllers",
    x: 1185,
    y: 260,
    label: "CONTROLLERS",
    sub: "Reconcile desired state",
    shape: "tower",
    layer: "control",
  },
  {
    id: "etcd",
    x: 1360,
    y: 300,
    label: "ETCD",
    sub: "Durable cluster state",
    shape: "database",
    layer: "control",
  },
  {
    id: "gateway",
    x: 745,
    y: 505,
    label: "GATEWAY",
    sub: "Implemented data plane",
    shape: "portal",
    layer: "network",
  },
  {
    id: "service",
    x: 965,
    y: 500,
    label: "SERVICE",
    sub: "Discover ready backends",
    shape: "orb",
    layer: "network",
  },
  {
    id: "cni",
    x: 1190,
    y: 500,
    label: "POD NETWORK",
    sub: "CNI implementation",
    shape: "portal",
    layer: "network",
  },
  {
    id: "coredns",
    x: 1410,
    y: 505,
    label: "CLUSTER DNS",
    sub: "Service name discovery",
    shape: "orb",
    layer: "network",
  },
  {
    id: "deployment",
    x: 905,
    y: 645,
    label: "DEPLOYMENT",
    sub: "Desired replicas & releases",
    shape: "cube",
    layer: "workload",
  },
  {
    id: "hpa",
    x: 1235,
    y: 645,
    label: "AUTOSCALING",
    sub: "Metrics → replica demand",
    shape: "cube",
    layer: "operations",
  },
  {
    id: "git",
    x: 160,
    y: 755,
    label: "GIT",
    sub: "Review & version",
    shape: "cube",
    layer: "delivery",
  },
  {
    id: "ci",
    x: 325,
    y: 835,
    label: "BUILD",
    sub: "Test, scan & sign",
    shape: "tower",
    layer: "delivery",
  },
  {
    id: "registry",
    x: 160,
    y: 980,
    label: "REGISTRY",
    sub: "Immutable artifacts",
    shape: "database",
    layer: "delivery",
  },
  {
    id: "gitops",
    x: 445,
    y: 910,
    label: "GITOPS",
    sub: "Optional reconciliation",
    shape: "cube",
    layer: "delivery",
  },
  {
    id: "pvc",
    x: 660,
    y: 1025,
    label: "PERSISTENT STORAGE",
    sub: "PVC → CSI → volume",
    shape: "database",
    layer: "storage",
  },
  {
    id: "database",
    x: 955,
    y: 1045,
    label: "DATA SERVICES",
    sub: "An explicit dependency",
    shape: "database",
    layer: "storage",
  },
  {
    id: "observability",
    x: 1250,
    y: 1025,
    label: "OBSERVABILITY",
    sub: "Metrics, logs & traces",
    shape: "tower",
    layer: "operations",
  },
  {
    id: "networkpolicy",
    x: 1590,
    y: 740,
    label: "NETWORK POLICY",
    sub: "Required enforcement",
    shape: "portal",
    layer: "security",
  },
  {
    id: "rbac",
    x: 1640,
    y: 420,
    label: "ACCESS & POLICY",
    sub: "Identity • RBAC • admission",
    shape: "portal",
    layer: "security",
  },
  {
    id: "dr",
    x: 1640,
    y: 995,
    label: "REGIONAL RECOVERY",
    sub: "Separately designed standby",
    shape: "orb",
    layer: "operations",
  },
];
export interface WorldLink {
  from: string;
  to: string;
  kind: "traffic" | "control" | "dependency";
}
export function flowDenied(
  link: WorldLink,
  scenario: Scenario,
  s: Simulation,
): boolean {
  if (link.kind !== "traffic") return false;
  if (s.nodes === 0) return !["waf", "loadbalancer"].includes(link.to);
  if (s.serviceAvailable) return false;
  if (scenario === "dependency-outage") return link.to === "database";
  if (scenario === "policy-block") return link.to === "pods";
  return false;
}

export function componentUnavailable(
  node: WorldNode,
  scenario: Scenario,
  s: Simulation,
): boolean {
  return (
    (s.nodes === 0 &&
      (["control", "network", "workload", "security"].includes(node.layer) ||
        ["pvc", "hpa"].includes(node.id))) ||
    (node.id === "database" &&
      scenario === "dependency-outage" &&
      !s.serviceAvailable)
  );
}
export const worldLinks: WorldLink[] = [
  { from: "clients", to: "waf", kind: "traffic" },
  { from: "clients", to: "dns", kind: "dependency" },
  { from: "dns", to: "loadbalancer", kind: "dependency" },
  { from: "waf", to: "loadbalancer", kind: "traffic" },
  { from: "loadbalancer", to: "gateway", kind: "traffic" },
  { from: "gateway", to: "service", kind: "traffic" },
  { from: "service", to: "pods", kind: "traffic" },
  { from: "pods", to: "database", kind: "traffic" },
  { from: "pods", to: "pvc", kind: "dependency" },
  { from: "pods", to: "observability", kind: "dependency" },
  { from: "git", to: "ci", kind: "control" },
  { from: "ci", to: "registry", kind: "dependency" },
  { from: "git", to: "gitops", kind: "control" },
  { from: "gitops", to: "api", kind: "control" },
  { from: "api", to: "etcd", kind: "control" },
  { from: "api", to: "scheduler", kind: "control" },
  { from: "api", to: "controllers", kind: "control" },
  { from: "controllers", to: "deployment", kind: "control" },
  { from: "deployment", to: "pods", kind: "control" },
  { from: "scheduler", to: "nodes", kind: "control" },
  { from: "hpa", to: "deployment", kind: "control" },
  { from: "coredns", to: "service", kind: "dependency" },
  { from: "cni", to: "nodes", kind: "dependency" },
  { from: "rbac", to: "api", kind: "control" },
  { from: "networkpolicy", to: "pods", kind: "dependency" },
  { from: "registry", to: "nodes", kind: "dependency" },
];
