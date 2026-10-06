import { worldNodes } from "../data/world.ts";
import { resourceAnchor, type Point } from "./flight.ts";

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}
export interface Orbit {
  yaw: number;
  pitch: number;
  separation: number;
}
export interface Perspective extends Orbit {
  target: Vector3;
  distance: number;
  center: Point;
  focal?: number;
}
export interface SpatialView {
  target: Vector3;
  distance: number;
  separation: number;
  pan: Point;
}
/** Zoom the actual 3D distance, so every close-up can return to the overview. */
export function zoomDistance(distance: number, factor: number) {
  const current = Number.isFinite(distance) && distance > 0 ? distance : 1670;
  const scale = Number.isFinite(factor) && factor > 0 ? factor : 1;
  return Math.max(200, Math.min(8000, current * scale));
}
export function viewportCamera(width: number, height: number) {
  const w = Number.isFinite(width) ? Math.max(240, width) : 1200;
  const h = Number.isFinite(height) ? Math.max(200, height) : 700;
  return { width: w, height: h, focal: Math.min(w, h) * 1.45 };
}
/** Frame a resource at a readable fraction of the viewport, independent of SVG scaling. */
export function focusDistance(
  width: number,
  height: number,
  extent = 70,
  layer = false,
) {
  const viewport = viewportCamera(width, height);
  if (layer)
    return Math.max(
      450,
      (viewport.focal * extent * 2) / (viewport.width * 0.7),
    );
  return Math.max(
    220,
    (viewport.focal * extent) /
      (Math.min(viewport.width, viewport.height) * 0.28),
  );
}
export const defaultOrbit: Orbit = { yaw: -0.32, pitch: 0.48, separation: 1 };
export const spatialPlanes = [
  {
    id: "foundation",
    title: "01 · FOUNDATION",
    detail: "Machines, runtime, network & storage prerequisites",
    color: "#88a8c8",
    y: -130,
    x: 0,
    z: 0,
    w: 420,
    d: 180,
    node: "nodes",
  },
  {
    id: "control",
    title: "02 · CONTROL PLANE",
    detail: "Decide and reconcile desired state",
    color: "#c5b0ff",
    y: 270,
    x: 0,
    z: -70,
    w: 420,
    d: 105,
    node: "api",
  },
  {
    id: "network",
    title: "03 · TRAFFIC & DISCOVERY",
    detail: "Implement routing and discover eligible backends",
    color: "#80e5db",
    y: 120,
    x: 0,
    z: 0,
    w: 420,
    d: 100,
    node: "service",
  },
  {
    id: "workload",
    title: "04 · WORKER DATA PLANE",
    detail: "Nodes run the application's containers",
    color: "#88bcff",
    y: 0,
    x: 0,
    z: 60,
    w: 420,
    d: 130,
    node: "pods",
  },
  {
    id: "delivery",
    title: "APPLICATION DELIVERY",
    detail: "Build, verify, publish & reconcile",
    color: "#edc08b",
    y: 0,
    x: -610,
    z: 20,
    w: 135,
    d: 160,
    node: "registry",
  },
  {
    id: "data",
    title: "DURABLE DATA",
    detail: "Persistence, dependency health & tested recovery",
    color: "#e4d59a",
    y: -150,
    x: 0,
    z: 350,
    w: 340,
    d: 75,
    node: "pvc",
  },
  {
    id: "security",
    title: "SECURITY GUARDRAILS",
    detail: "Identity, least privilege & permitted flows",
    color: "#edacbc",
    y: 130,
    x: 610,
    z: 10,
    w: 115,
    d: 120,
    node: "rbac",
  },
  {
    id: "operations",
    title: "OPERATIONS & RECOVERY",
    detail: "Measure user success and prove recovery",
    color: "#a2e7bb",
    y: -70,
    x: 590,
    z: 320,
    w: 140,
    d: 100,
    node: "observability",
  },
] as const;
export type SpatialPlane = (typeof spatialPlanes)[number]["id"];
const positions: Record<string, Vector3> = {
  clients: { x: -830, y: 140, z: -100 },
  dns: { x: -640, y: 200, z: -190 },
  waf: { x: -580, y: 145, z: -140 },
  loadbalancer: { x: -440, y: 140, z: -90 },
  api: { x: -285, y: 310, z: -70 },
  scheduler: { x: -95, y: 310, z: -70 },
  controllers: { x: 95, y: 310, z: -70 },
  etcd: { x: 285, y: 310, z: -70 },
  gateway: { x: -285, y: 155, z: 0 },
  service: { x: -95, y: 155, z: 0 },
  cni: { x: 95, y: 155, z: 0 },
  coredns: { x: 285, y: 155, z: 0 },
  deployment: { x: -90, y: 55, z: -75 },
  hpa: { x: 180, y: 55, z: -75 },
  git: { x: -680, y: 35, z: -60 },
  ci: { x: -555, y: 35, z: -60 },
  registry: { x: -680, y: 35, z: 110 },
  gitops: { x: -555, y: 35, z: 110 },
  pvc: { x: -165, y: -115, z: 350 },
  database: { x: 140, y: -115, z: 350 },
  rbac: { x: 610, y: 165, z: -55 },
  networkpolicy: { x: 610, y: 165, z: 90 },
  observability: { x: 500, y: -35, z: 320 },
  dr: { x: 680, y: -35, z: 320 },
  "node-a": { x: -265, y: 30, z: 65 },
  "node-b": { x: 0, y: 30, z: 65 },
  "node-c": { x: 265, y: 30, z: 65 },
  "frontend-service": { x: -95, y: 155, z: 85 },
};
export function podPosition(
  zone: number,
  slot: number,
  separation = 1,
): Vector3 {
  return {
    x: -215 + zone * 265 + (slot % 2) * 52,
    y: 36 * separation,
    z: 105 + Math.floor(slot / 2) * 65,
  };
}
export function spatialPosition(
  id: string,
  separation = 1,
  anchor?: Point,
): Vector3 {
  if (!anchor && positions[id])
    return { ...positions[id], y: positions[id].y * separation };
  const point = anchor ?? resourceAnchor(id);
  const nodeAnchors = [754, 1044, 1334];
  const nodeIndex = nodeAnchors.findIndex(
    (x) => Math.abs(x - point.x) < 2 && Math.abs(point.y - 795) < 2,
  );
  if (nodeIndex >= 0)
    return {
      ...positions[`node-${String.fromCharCode(97 + nodeIndex)}`],
      y: 30 * separation,
    };
  const podAnchors = [826, 890, 1116, 1180, 1404, 1468];
  if (Math.abs(point.y - 806) < 3 && podAnchors.includes(point.x)) {
    const index = podAnchors.indexOf(point.x);
    return podPosition(Math.floor(index / 2), index % 2, separation);
  }
  const owner = worldNodes.find(
    (n) => Math.abs(n.x - point.x) < 2 && Math.abs(n.y - 42 - point.y) < 2,
  );
  const p =
    (anchor && owner ? positions[owner.id] : positions[id]) ??
    (owner && positions[owner.id]);
  if (p) return { ...p, y: p.y * separation };
  const nearest = worldNodes.reduce((a, b) =>
    Math.hypot(a.x - point.x, a.y - 42 - point.y) <
    Math.hypot(b.x - point.x, b.y - 42 - point.y)
      ? a
      : b,
  );
  const fallback = positions[nearest.id];
  return { ...fallback, y: fallback.y * separation };
}
export function flightLift(from: Vector3, to: Vector3) {
  return Math.min(
    90,
    Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z) * 0.15,
  );
}
export function coursePoint(
  from: Vector3,
  to: Vector3,
  progress: number,
  lift = flightLift(from, to),
) {
  const t = Math.min(1, Math.max(0, progress));
  const point = mixVector(from, to, t);
  if (t > 0 && t < 1) point.y += Math.sin(t * Math.PI) * lift;
  return point;
}
export function spatialFlightPose(
  from: Vector3,
  to: Vector3,
  initialDistance: number,
  progress: number,
  arrivalDistance = 630,
) {
  const t = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const ease = (v: number) => v * v * (3 - 2 * v);
  const transit = ease(Math.min(1, Math.max(0, (t - 0.2) / 0.5)));
  const ship = coursePoint(from, to, transit);
  return {
    ship,
    target: ship,
    distance:
      t < 0.2
        ? initialDistance + (1420 - initialDistance) * ease(t / 0.2)
        : t < 0.7
          ? 1420
          : 1420 - (1420 - arrivalDistance) * ease((t - 0.7) / 0.3),
    transit,
  };
}
export function mixVector(a: Vector3, b: Vector3, t: number): Vector3 {
  const value = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0));
  if (value === 0) return { ...a };
  if (value === 1) return { ...b };
  return {
    x: a.x + (b.x - a.x) * value,
    y: a.y + (b.y - a.y) * value,
    z: a.z + (b.z - a.z) * value,
  };
}
export function project(
  p: Vector3,
  c: Perspective,
): Point & { depth: number; scale: number; visible: boolean } {
  const dx = p.x - c.target.x,
    dy = p.y - c.target.y,
    dz = p.z - c.target.z;
  const right = dx * Math.cos(c.yaw) - dz * Math.sin(c.yaw);
  const forward = dx * Math.sin(c.yaw) + dz * Math.cos(c.yaw);
  const up = dy * Math.cos(c.pitch) - forward * Math.sin(c.pitch);
  const rawDepth =
    c.distance - dy * Math.sin(c.pitch) - forward * Math.cos(c.pitch);
  const depth = Math.max(80, rawDepth);
  const scale = (c.focal ?? 1080) / depth;
  return {
    x: c.center.x + right * scale,
    y: c.center.y - up * scale,
    depth,
    scale,
    visible: rawDepth > 80,
  };
}
export function orbitBounds(orbit: Orbit): Orbit {
  return {
    yaw: Number.isFinite(orbit.yaw) ? orbit.yaw : defaultOrbit.yaw,
    pitch: Math.max(
      -1.4,
      Math.min(
        1.4,
        Number.isFinite(orbit.pitch) ? orbit.pitch : defaultOrbit.pitch,
      ),
    ),
    separation: Math.max(
      0.2,
      Math.min(1.6, Number.isFinite(orbit.separation) ? orbit.separation : 1),
    ),
  };
}
