"use client";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent,
  type MouseEvent,
} from "react";
import type { SceneProps } from "./architecture-scene";
import {
  worldNodes,
  worldLinks,
  componentUnavailable,
  flowDenied,
} from "./data/world";
import { getColor, conceptById } from "./data/concepts";
import { visiblePods } from "./lib/lab";
import {
  defaultOrbit,
  spatialPlanes,
  spatialPosition,
  podPosition,
  project,
  orbitBounds,
  spatialFlightPose,
  coursePoint,
  flightLift,
  type Vector3,
  type Perspective,
  type Orbit,
} from "./lib/spatial";

function Face({
  vertices,
  camera,
  fill,
  stroke,
  opacity = 1,
}: {
  vertices: Vector3[];
  camera: Perspective;
  fill: string;
  stroke: string;
  opacity?: number;
}) {
  if (!vertices.every((v) => project(v, camera).visible)) return null;
  return (
    <polygon
      points={vertices
        .map((v) => {
          const p = project(v, camera);
          return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
        })
        .join(" ")}
      fill={fill}
      stroke={stroke}
      strokeOpacity=".6"
      strokeWidth="1"
      opacity={opacity}
    />
  );
}
function Box({
  p,
  w,
  h,
  d,
  color,
  camera,
}: {
  p: Vector3;
  w: number;
  h: number;
  d: number;
  color: string;
  camera: Perspective;
}) {
  const vertices = [-1, 1].flatMap((y) =>
    [-1, 1].flatMap((z) =>
      [-1, 1].map((x) => ({
        x: p.x + (x * w) / 2,
        y: p.y + ((y + 1) * h) / 2,
        z: p.z + (z * d) / 2,
      })),
    ),
  );
  const faces = [
    [0, 1, 3, 2],
    [0, 4, 5, 1],
    [1, 5, 7, 3],
    [2, 3, 7, 6],
    [0, 2, 6, 4],
    [4, 6, 7, 5],
  ];
  return (
    <g>
      {faces
        .map((ids, i) => ({
          ids,
          i,
          depth:
            ids.reduce(
              (n, index) => n + project(vertices[index], camera).depth,
              0,
            ) / 4,
        }))
        .sort((a, b) => b.depth - a.depth)
        .map(({ ids, i }) => (
          <Face
            key={i}
            vertices={ids.map((index) => vertices[index])}
            camera={camera}
            fill={i === 5 ? color : i % 2 === 0 ? "#183041" : "#0a1b2b"}
            stroke={color}
            opacity={i === 5 ? 0.7 : 0.95}
          />
        ))}
    </g>
  );
}
function route(a: Vector3, b: Vector3, camera: Perspective, lift = 28) {
  return Array.from({ length: 25 }, (_, i) => {
    const p = coursePoint(a, b, i / 24, lift);
    const q = project(p, camera);
    return `${i ? "L" : "M"}${q.x.toFixed(2)} ${q.y.toFixed(2)}`;
  }).join(" ");
}
function Cylinder({
  p,
  camera,
  color,
}: {
  p: Vector3;
  camera: Perspective;
  color: string;
}) {
  const ring = (height: number) =>
    Array.from({ length: 16 }, (_, i) => ({
      x: p.x + Math.cos((i * Math.PI) / 8) * 27,
      y: p.y + height,
      z: p.z + Math.sin((i * Math.PI) / 8) * 27,
    }));
  const low = ring(0),
    high = ring(54);
  const sides = low
    .map((point, i) => [point, low[(i + 1) % 16], high[(i + 1) % 16], high[i]])
    .sort((a, b) => project(b[0], camera).depth - project(a[0], camera).depth);
  return (
    <g>
      {sides.map((vertices, i) => (
        <Face
          key={i}
          vertices={vertices}
          camera={camera}
          fill="#172e38"
          stroke={color}
          opacity={0.9}
        />
      ))}
      <Face
        vertices={high}
        camera={camera}
        fill={color}
        stroke={color}
        opacity={0.6}
      />
      {[18, 36].map((height) => (
        <path
          key={height}
          d={
            ring(height)
              .map((v, i) => {
                const q = project(v, camera);
                return `${i ? "L" : "M"}${q.x} ${q.y}`;
              })
              .join(" ") + "Z"
          }
          fill="none"
          stroke={color}
          strokeOpacity=".35"
        />
      ))}
    </g>
  );
}
function Portal({
  p,
  camera,
  color,
}: {
  p: Vector3;
  camera: Perspective;
  color: string;
}) {
  const center = project({ ...p, y: p.y + 33 }, camera);
  return (
    <g>
      <Box
        p={{ ...p, x: p.x - 23 }}
        w={9}
        h={63}
        d={24}
        color={color}
        camera={camera}
      />
      <Box
        p={{ ...p, x: p.x + 23 }}
        w={9}
        h={63}
        d={24}
        color={color}
        camera={camera}
      />
      <Box
        p={{ ...p, y: p.y + 54 }}
        w={55}
        h={9}
        d={24}
        color={color}
        camera={camera}
      />
      <text
        x={center.x}
        y={center.y + 8}
        fill={color}
        textAnchor="middle"
        fontSize={25 * center.scale}
      >
        →
      </text>
    </g>
  );
}
function FlightShip({
  from,
  to,
  progress,
  camera,
  color,
}: {
  from: Vector3;
  to: Vector3;
  progress: number;
  camera: Perspective;
  color: string;
}) {
  const point = coursePoint(from, to, progress),
    before = coursePoint(from, to, Math.max(0, progress - 0.005)),
    after = coursePoint(from, to, Math.min(1, progress + 0.005));
  const dx = after.x - before.x,
    dy = after.y - before.y,
    dz = after.z - before.z,
    length = Math.hypot(dx, dy, dz) || 1;
  const direction = { x: dx / length, y: dy / length, z: dz / length };
  if (dx === 0 && dy === 0 && dz === 0) direction.x = 1;
  const horizontal = Math.hypot(direction.x, direction.z) || 1;
  const right = {
    x: direction.z / horizontal,
    y: 0,
    z: -direction.x / horizontal,
  };
  const vertex = (forward: number, side: number, up = 0) => ({
    x: point.x + direction.x * forward + right.x * side,
    y: point.y + direction.y * forward + up,
    z: point.z + direction.z * forward + right.z * side,
  });
  const nose = vertex(27, 0),
    left = vertex(-17, -21),
    tail = vertex(-10, 0),
    wing = vertex(-17, 21),
    spine = vertex(2, 0, 9);
  const exhaust = project(vertex(-35, 0), camera),
    engine = project(vertex(-14, 0), camera);
  return (
    <g className="spatial-craft" aria-hidden="true">
      <path
        d={`M${engine.x} ${engine.y}L${exhaust.x} ${exhaust.y}`}
        stroke={color}
        strokeWidth="8"
        filter="url(#ship-glow)"
      />
      <Face
        vertices={[nose, left, tail]}
        camera={camera}
        fill="#e0f8f5"
        stroke="#97cbc9"
      />
      <Face
        vertices={[nose, tail, wing]}
        camera={camera}
        fill="#9dc9d0"
        stroke="#97cbc9"
      />
      <Face
        vertices={[nose, left, spine]}
        camera={camera}
        fill="#a4dbe2"
        stroke="#97cbc9"
      />
      <Face
        vertices={[nose, spine, wing]}
        camera={camera}
        fill="#f0fffa"
        stroke="#b2f4e2"
      />
      <Face
        vertices={[
          vertex(13, 0, 5),
          vertex(-2, -6, 7),
          spine,
          vertex(-2, 6, 7),
        ]}
        camera={camera}
        fill="#163b57"
        stroke="#b2f4e2"
      />
      {Array.from({ length: 9 }, (_, i) => {
        const t = Math.max(0, progress - (i + 1) * 0.018),
          q = project(coursePoint(from, to, t), camera);
        return (
          <circle
            key={i}
            cx={q.x}
            cy={q.y}
            r={Math.max(1, 3 - i * 0.2)}
            fill={color}
            opacity={0.55 - i * 0.05}
          />
        );
      })}
    </g>
  );
}
export default function SpatialScene(p: SceneProps) {
  const [orbit, setOrbit] = useState<Orbit>(defaultOrbit),
    [isolated, setIsolated] = useState<string | null>(null);
  const drag = useRef<{
    x: number;
    y: number;
    orbit: Orbit;
    moved: boolean;
  } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const { camera: manualCamera, onCamera } = p;
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    function wheel(event: WheelEvent) {
      event.preventDefault();
      onCamera({
        ...manualCamera,
        zoom: Math.max(
          0.65,
          Math.min(3.4, manualCamera.zoom - event.deltaY * 0.002),
        ),
      });
    }
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [manualCamera, onCamera]);
  const planeFocus = spatialPlanes.find(
    (plane) => plane.id === isolated && (!p.flight || p.guided === false),
  );
  const activeIsolation = planeFocus?.id;
  const destination = p.flight
    ? spatialPosition(p.flight.node, orbit.separation, p.flight.destination)
    : { x: 0, y: 80, z: 0 };
  const visual = p.flight?.visual;
  const travelTo = visual?.previous
    ? spatialPosition("pods", orbit.separation, visual.to)
    : destination;
  // Both camera and ship use the same 3D curve, so the reticle cannot drift away from its destination.
  const from = visual
    ? spatialPosition("pods", orbit.separation, visual.from)
    : destination;
  const pose = spatialFlightPose(
    from,
    travelTo,
    1670 / (visual?.initialZoom ?? 1),
    visual?.progress ?? (p.flight ? 0 : 1),
  );
  const camera: Perspective = {
    ...orbit,
    target: planeFocus
      ? { x: planeFocus.x, y: planeFocus.y * orbit.separation, z: planeFocus.z }
      : p.flight && visual
        ? pose.target
        : { x: -40, y: 60, z: 70 },
    distance: planeFocus
      ? 1250 / p.camera.zoom
      : p.flight && visual && p.guided !== false
        ? pose.distance
        : p.flight && visual
          ? (pose.distance * (visual.camera?.zoom ?? p.camera.zoom)) /
            p.camera.zoom
          : 1670 / p.camera.zoom,
    center: { x: p.flight ? 850 : 1020, y: 430 },
  };
  const planned = (id: string) => {
    const step = p.lab.learning?.step;
    if (step === undefined) return false;
    const thresholds: Record<string, number> = {
      deployment: 3,
      service: 9,
      gateway: 13,
      hpa: 15,
      "frontend-service": 10,
    };
    return step < (thresholds[id] ?? 0);
  };
  const items: { key: string; depth: number; element: ReactNode }[] = [];
  const add = (key: string, position: Vector3, element: ReactNode) =>
    items.push({ key, depth: project(position, camera).depth, element });
  const conceptId = (id: string) =>
    id.startsWith("node-")
      ? "nodes"
      : id === "frontend-service"
        ? "service"
        : id;
  function selectResource(event: MouseEvent<SVGGElement>) {
    const id = event.currentTarget.dataset.conceptId;
    if (id && !drag.current?.moved) p.onSelect(id);
  }
  const focusResource = (id: string) =>
    p.selected === conceptId(id) ||
    p.focus === conceptId(id) ||
    p.highlights.includes(conceptId(id));
  function resource(
    id: string,
    label: string,
    pos: Vector3,
    color: string,
    shape: string,
    state = "ready",
    sub = "",
  ) {
    const q = project(pos, camera),
      top = project({ ...pos, y: pos.y + 65 }, camera),
      active = focusResource(id);
    if (!q.visible) return;
    const unavailable = state === "lost" || state === "offline";
    const tint = unavailable
      ? "#ff8594"
      : state === "starting" || state === "pending"
        ? "#efcc89"
        : color;
    const planeId =
      id.startsWith("node-") || id === "pods" || id === "deployment"
        ? "workload"
        : id === "frontend-service"
          ? "network"
          : id === "pvc" || id === "database"
            ? "data"
            : id === "rbac" || id === "networkpolicy"
              ? "security"
              : id === "hpa" || id === "observability" || id === "dr"
                ? "operations"
                : conceptById[id]?.layer;
    const hidden =
      activeIsolation &&
      activeIsolation !== planeId &&
      !(activeIsolation === "foundation" && id.startsWith("node-"));
    add(
      id + label,
      pos,
      <g
        role="button"
        tabIndex={0}
        aria-label={`Explain ${label}: ${state}`}
        onClick={selectResource}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            p.onSelect(conceptId(id));
          }
        }}
        className={`spatial-resource ${active ? "spatial-active" : ""}`}
        opacity={
          hidden
            ? 0.08
            : planned(id)
              ? 0.2
              : p.layer !== "all" &&
                  conceptById[conceptId(id)]?.layer !== p.layer &&
                  !active
                ? 0.18
                : 1
        }
        data-spatial-resource={id}
        data-concept-id={conceptId(id)}
        data-state={state}
      >
        <ellipse
          cx={q.x}
          cy={q.y + 8}
          rx={42 * q.scale}
          ry={15 * q.scale}
          fill={tint}
          opacity=".1"
        />
        {shape === "database" ? (
          <Cylinder p={pos} camera={camera} color={tint} />
        ) : shape === "portal" ? (
          <Portal p={pos} camera={camera} color={tint} />
        ) : shape === "orb" ? (
          <g>
            <circle
              cx={top.x}
              cy={top.y + 20 * q.scale}
              r={26 * q.scale}
              fill="#0d2533"
              stroke={tint}
            />
            <ellipse
              cx={top.x}
              cy={top.y + 20 * q.scale}
              rx={26 * q.scale}
              ry={9 * q.scale}
              fill="none"
              stroke={tint}
              opacity=".45"
            />
            <ellipse
              cx={top.x}
              cy={top.y + 20 * q.scale}
              rx={9 * q.scale}
              ry={26 * q.scale}
              fill="none"
              stroke={tint}
              opacity=".45"
            />
            <circle
              cx={top.x}
              cy={top.y + 20 * q.scale}
              r={3 * q.scale}
              fill={tint}
            />
          </g>
        ) : (
          <Box
            p={pos}
            w={shape === "cube" ? 35 : 48}
            h={shape === "tower" ? 70 : 46}
            d={36}
            camera={camera}
            color={tint}
          />
        )}
        {shape === "tower" &&
          [18, 33, 48].map((h) => {
            const a = project(
                { x: pos.x - 17, y: pos.y + h, z: pos.z + 19 },
                camera,
              ),
              b = project(
                { x: pos.x + 17, y: pos.y + h, z: pos.z + 19 },
                camera,
              );
            return (
              <path
                key={h}
                d={`M${a.x} ${a.y}L${b.x} ${b.y}`}
                stroke={tint}
                strokeWidth={2 * q.scale}
              />
            );
          })}
        {active && (
          <g className="spatial-beacon">
            <ellipse
              cx={q.x}
              cy={q.y + 5}
              rx={55 * q.scale}
              ry={19 * q.scale}
              stroke={tint}
              fill="none"
              strokeWidth="2"
            />
            <path d={`M${top.x} ${top.y - 12}v-24`} stroke={tint} />
          </g>
        )}
        {unavailable && (
          <text
            x={top.x}
            y={top.y}
            className="spatial-cross"
            textAnchor="middle"
          >
            ×
          </text>
        )}
        <text
          x={q.x}
          y={q.y + 29}
          textAnchor="middle"
          className="spatial-label"
          fill={tint}
        >
          {label}
        </text>
        {sub && (
          <text
            x={q.x}
            y={q.y + 44}
            textAnchor="middle"
            className="spatial-sub"
          >
            {sub}
          </text>
        )}
      </g>,
    );
  }
  spatialPlanes.forEach((plane) => {
    const pos = { x: plane.x, y: plane.y * orbit.separation, z: plane.z },
      label = project(
        { x: pos.x - plane.w, y: pos.y, z: pos.z + plane.d },
        camera,
      );
    add(
      plane.id,
      pos,
      <g
        data-spatial-plane={plane.id}
        opacity={activeIsolation && activeIsolation !== plane.id ? 0.08 : 1}
      >
        <g opacity=".24">
          <Box
            p={{ ...pos, y: pos.y - 9 }}
            w={plane.w * 2}
            h={9}
            d={plane.d * 2}
            color={plane.color}
            camera={camera}
          />
        </g>
        {[-0.5, 0, 0.5].map((v) => (
          <g key={v} opacity=".12">
            <path
              d={route(
                { x: pos.x + plane.w * v, y: pos.y + 1, z: pos.z - plane.d },
                { x: pos.x + plane.w * v, y: pos.y + 1, z: pos.z + plane.d },
                camera,
                0,
              )}
              stroke={plane.color}
            />
            <path
              d={route(
                { x: pos.x - plane.w, y: pos.y + 1, z: pos.z + plane.d * v },
                { x: pos.x + plane.w, y: pos.y + 1, z: pos.z + plane.d * v },
                camera,
                0,
              )}
              stroke={plane.color}
            />
          </g>
        ))}
        <g
          role="button"
          tabIndex={0}
          aria-label={`Explain ${plane.title}`}
          data-concept-id={plane.node}
          onClick={selectResource}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              p.onSelect(plane.node);
            }
          }}
        >
          <text
            x={label.x}
            y={label.y + 22}
            className="spatial-plane-label"
            fill={plane.color}
          >
            {plane.title}
          </text>
        </g>
      </g>,
    );
  });
  const links = worldLinks.filter(
    (link) =>
      link.to !== "pods" &&
      (!p.lab.learning ||
        ((link.from !== "pods" || p.lab.learning.step >= 9) &&
          (link.from !== "deployment" || p.lab.learning.step >= 5) &&
          (!["service", "gateway"].includes(link.to) || !planned(link.to)))),
  );
  const connections = links.map((link, i) => {
    const a = spatialPosition(link.from, orbit.separation),
      b = spatialPosition(link.to, orbit.separation),
      denied = flowDenied(link, p.scenario, p.simulation);
    return (
      <g
        key={i}
        role="button"
        tabIndex={0}
        aria-label={`Explain connection: ${link.from} to ${link.to}`}
        onClick={() => {
          if (!drag.current?.moved) p.onConnection(link);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            p.onConnection(link);
          }
        }}
        opacity={p.flight ? 0.2 : 0.42}
      >
        <path
          d={route(a, b, camera)}
          fill="none"
          stroke={
            denied ? "#fc8393" : link.kind === "traffic" ? "#78ddd4" : "#929ccb"
          }
          strokeDasharray={
            link.kind === "traffic" && !denied ? undefined : "4 6"
          }
          strokeWidth="1.5"
        />
        <path
          d={route(a, b, camera)}
          fill="none"
          stroke="transparent"
          strokeWidth="16"
        />
      </g>
    );
  });
  worldNodes.forEach((n) =>
    resource(
      n.id,
      n.label,
      spatialPosition(n.id, orbit.separation),
      getColor(n.layer),
      n.shape,
      componentUnavailable(n, p.scenario, p.simulation) ? "offline" : "ready",
      n.id === "dr" && p.simulation.secondaryActive
        ? "INDEPENDENT STANDBY · SERVING"
        : n.sub,
    ),
  );
  for (let zone = 0; zone < 3; zone++) {
    const offline =
      p.simulation.nodes === 0 || p.simulation.failedZone === zone;
    resource(
      `node-${String.fromCharCode(97 + zone)}`,
      `NODE ${zone + 1}`,
      spatialPosition(
        `node-${String.fromCharCode(97 + zone)}`,
        orbit.separation,
      ),
      "#8abaff",
      "tower",
      offline ? "offline" : "ready",
      `ZONE ${String.fromCharCode(65 + zone)}`,
    );
    visiblePods(p.scenario, p.lab, zone).forEach((pod) => {
      const pos = podPosition(zone, pod.slot, orbit.separation),
        frontend = !!p.lab.learning && (pod.id === "A2" || pod.id === "C1");
      if (p.simulation.nodes > 3 && zone === 2 && pod.slot >= 2) {
        pos.x += 80;
        pos.z += 110;
      }
      resource(
        "pods",
        `${frontend ? "WEB" : p.lab.learning ? "API" : "POD"} ${pod.id}${pod.replacement ? "′" : ""}`,
        pos,
        pod.version === "v2" ? "#a2e7bb" : "#8abaff",
        "cube",
        pod.state,
        `${pod.state.toUpperCase()} · ${pod.version}`,
      );
      if (p.lab.learning && p.lab.learning.step >= 5)
        connections.push(
          <path
            key={`owner-${pod.id}`}
            d={route(
              spatialPosition("deployment", orbit.separation),
              pos,
              camera,
            )}
            fill="none"
            stroke="#aaa8df"
            strokeDasharray="3 7"
            opacity=".2"
          />,
        );
      if (pod.state === "ready" && p.lab.learning?.serviceAvailable !== false) {
        const origin = spatialPosition(
            frontend ? "frontend-service" : "service",
            orbit.separation,
          ),
          denied =
            p.scenario === "policy-block" && !p.simulation.serviceAvailable;
        connections.push(
          <path
            key={`pod-${pod.id}`}
            data-spatial-endpoint={pod.id}
            data-service-owner={frontend ? "frontend" : "api"}
            d={route(origin, pos, camera)}
            fill="none"
            stroke={denied ? "#ff8594" : "#77dacc"}
            strokeDasharray={denied ? "4 5" : undefined}
            opacity={p.flight ? 0.2 : 0.55}
          />,
        );
      }
    });
  }
  if (p.simulation.nodes > 3)
    resource(
      "nodes",
      "ADDED NODE 4",
      { x: 385, y: 30 * orbit.separation, z: 220 },
      "#a2e7bb",
      "tower",
      "ready",
      "ZONE C · ELIGIBLE COMPUTE ADDED",
    );
  if (p.simulation.secondaryActive)
    for (let i = 0; i < 6; i++)
      resource(
        "dr",
        `STANDBY ${i + 1}`,
        {
          x: 550 + (i % 3) * 55,
          y: -30 * orbit.separation,
          z: 425 + Math.floor(i / 3) * 55,
        },
        "#a2e7bb",
        "cube",
        "ready",
        "SEPARATE CLUSTER",
      );
  if (p.lab.learning && p.lab.learning.step >= 10)
    resource(
      "frontend-service",
      "FRONTEND SERVICE",
      spatialPosition("frontend-service", orbit.separation),
      "#80e5db",
      "orb",
    );
  const destinationScreen = project(destination, camera),
    returning = p.flight?.phase === "Response returns";
  function pointerDown(e: PointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, orbit, moved: false };
  }
  function pointerMove(e: PointerEvent<SVGSVGElement>) {
    const d = drag.current;
    if (!d || !e.buttons) return;
    const x = e.clientX - d.x,
      y = e.clientY - d.y;
    if (Math.hypot(x, y) > 4) d.moved = true;
    if (d.moved) {
      if (!e.currentTarget.hasPointerCapture(e.pointerId))
        e.currentTarget.setPointerCapture(e.pointerId);
      setOrbit(
        orbitBounds({
          ...d.orbit,
          yaw: d.orbit.yaw + x * 0.005,
          pitch: d.orbit.pitch + y * 0.004,
        }),
      );
    }
  }
  return (
    <>
      <svg
        ref={svg}
        viewBox="0 0 1600 900"
        className={`universe-scene spatial-scene ${p.motion ? "spatial-motion" : ""}`}
        role="group"
        aria-label="Perspective Kubernetes architecture. Drag to orbit. Use the spatial controls to tilt or separate layers."
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <defs>
          <radialGradient id="spatial-halo">
            <stop stopColor="#456d86" stopOpacity=".22" />
            <stop offset="1" stopColor="#06131c" stopOpacity="0" />
          </radialGradient>
          <filter id="ship-glow">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        <ellipse
          cx="960"
          cy="510"
          rx="580"
          ry="370"
          fill="url(#spatial-halo)"
        />
        <g opacity={activeIsolation ? 0.12 : 1}>{connections}</g>
        <g>
          {items
            .sort((a, b) => b.depth - a.depth)
            .map((item) => (
              <g key={item.key}>{item.element}</g>
            ))}
        </g>
        {p.flight && !activeIsolation && (
          <g
            data-spatial-flight={p.flight.node}
            data-flight-phase={visual?.phase ?? "Plotting course"}
          >
            <path
              d={route(from, travelTo, camera, flightLift(from, travelTo))}
              stroke={returning ? "#edc88f" : "#a4f7e8"}
              strokeWidth="2"
              strokeDasharray="4 7"
              fill="none"
              opacity=".55"
            />
            <g
              transform={`translate(${destinationScreen.x} ${destinationScreen.y})`}
              className="spatial-target"
            >
              <ellipse
                rx="46"
                ry="16"
                fill="none"
                stroke={returning ? "#edc88f" : "#a4f7e8"}
              />
              <path
                d="M-52 -38h-10v18M52 -38h10v18M-52 38h-10v-18M52 38h10v-18"
                fill="none"
                stroke="#e6fff8"
              />
              <text y="-48" textAnchor="middle">
                {conceptById[p.flight.node]?.title.toUpperCase()}
              </text>
            </g>
            <FlightShip
              from={from}
              to={travelTo}
              progress={pose.transit}
              camera={camera}
              color={returning ? "#edc88f" : "#84f6e4"}
            />
          </g>
        )}
      </svg>
      <section
        className="spatial-tools"
        aria-label="Explore the three-dimensional architecture"
      >
        <div>
          <span>SPATIAL EXPLORER</span>
          <button
            onClick={() => {
              setOrbit(defaultOrbit);
              setIsolated(null);
            }}
            title="Reset spatial view"
          >
            Reset view
          </button>
        </div>
        <p>Drag to orbit · inspect any resource</p>
        <label>
          Rotate{" "}
          <input
            aria-label="Rotate architecture"
            type="range"
            min="-3.14"
            max="3.14"
            step=".01"
            value={orbit.yaw}
            onChange={(e) =>
              setOrbit({ ...orbit, yaw: Number(e.target.value) })
            }
          />
        </label>
        <label>
          Tilt{" "}
          <input
            aria-label="Tilt architecture"
            type="range"
            min=".15"
            max="1.1"
            step=".01"
            value={orbit.pitch}
            onChange={(e) =>
              setOrbit({ ...orbit, pitch: Number(e.target.value) })
            }
          />
        </label>
        <label>
          Separate layers{" "}
          <input
            aria-label="Separate architecture layers"
            type="range"
            min=".2"
            max="1.6"
            step=".01"
            value={orbit.separation}
            onChange={(e) =>
              setOrbit({ ...orbit, separation: Number(e.target.value) })
            }
          />
        </label>
        <label className="spatial-isolate">
          Explore a layer
          <select
            aria-label="Isolate an architecture layer"
            value={activeIsolation ?? "all"}
            onChange={(e) => {
              setIsolated(e.target.value === "all" ? null : e.target.value);
              onCamera({ x: 0, y: 0, zoom: 1 });
            }}
          >
            <option value="all">Whole architecture</option>
            {spatialPlanes.map((plane) => (
              <option key={plane.id} value={plane.id}>
                {plane.title}
              </option>
            ))}
          </select>
        </label>
        <small>
          {planeFocus?.detail ??
            "Layers explain responsibilities; these are not separate required clusters. Control and data planes share APIs and infrastructure."}
        </small>
      </section>
    </>
  );
}
