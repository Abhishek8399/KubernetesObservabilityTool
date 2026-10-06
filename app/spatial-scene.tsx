"use client";
import {
  useEffect,
  useCallback,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent,
  type MouseEvent,
  type KeyboardEvent,
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
import { Icon } from "./icons";
import {
  placeLabels,
  readableName,
  type SceneLabel,
  type LabelBox,
} from "./lib/scene-labels";
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
  viewportCamera,
  focusDistance,
  mixVector,
  zoomDistance,
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
  const [viewport, setViewport] = useState(() => viewportCamera(1200, 700));
  const [labels, setLabels] = useState(true);
  const [hovered, setHovered] = useState<{
    label: string;
    role: string;
    state: string;
    x: number;
    y: number;
  } | null>(null);
  const [dragMode, setDragMode] = useState<"orbit" | "pan">("orbit");
  const [overview, setOverview] = useState<string | null>(
    p.guided === false ? (p.flight?.stopKey ?? "overview") : null,
  );
  const [pan, setPan] = useState({
    x: 0,
    y: 0,
    key: p.flight?.stopKey ?? "overview",
  });
  const [focus, setFocus] = useState<{
    key: string;
    target: Vector3;
    distance: number;
    zoom: number;
    separation: number;
    id: string;
    label: string;
    state: string;
    inspect: boolean;
  } | null>(null);
  const focusAnimation = useRef<number | null>(null);
  const drag = useRef<{
    x: number;
    y: number;
    orbit: Orbit;
    pan: { x: number; y: number };
    mode: "orbit" | "pan";
    moved: boolean;
  } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setViewport(viewportCamera(width, height));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(
    () => () => {
      if (focusAnimation.current !== null)
        cancelAnimationFrame(focusAnimation.current);
    },
    [p.flight?.stopKey],
  );
  const { onCamera } = p;
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
  const from = visual?.spatialStart
    ? {
        ...visual.spatialStart.target,
        y:
          (visual.spatialStart.target.y * orbit.separation) /
          visual.spatialStart.separation,
      }
    : visual
      ? spatialPosition("pods", orbit.separation, visual.from)
      : destination;
  const pose = spatialFlightPose(
    from,
    travelTo,
    visual?.spatialStart?.distance ?? 1670 / (visual?.initialZoom ?? 1),
    visual?.progress ?? (p.flight ? 0 : 1),
    focusDistance(viewport.width, viewport.height),
  );
  const focusKey = p.flight?.stopKey ?? "overview";
  const overviewActive = overview === focusKey && p.guided === false;
  const departurePan = Math.max(0, 1 - (visual?.progress ?? 1) / 0.2);
  const activePan =
    pan.key === focusKey
      ? pan
      : p.flight && p.guided !== false && visual?.spatialStart
        ? {
            x: visual.spatialStart.pan.x * departurePan,
            y: visual.spatialStart.pan.y * departurePan,
          }
        : { x: 0, y: 0 };
  const activeFocus =
    focus?.key === focusKey && (!p.flight || p.guided === false) ? focus : null;
  const camera: Perspective = {
    ...orbit,
    focal: viewport.focal,
    target: activeFocus
      ? {
          ...activeFocus.target,
          y: (activeFocus.target.y * orbit.separation) / activeFocus.separation,
        }
      : planeFocus
        ? {
            x: planeFocus.x,
            y: planeFocus.y * orbit.separation,
            z: planeFocus.z,
          }
        : p.flight && visual && !overviewActive
          ? { ...pose.target, y: pose.target.y + 28 }
          : { x: -40, y: 60, z: 70 },
    distance: activeFocus
      ? (activeFocus.distance * activeFocus.zoom) / p.camera.zoom
      : planeFocus
        ? 1250 / p.camera.zoom
        : overviewActive
          ? 1670 / p.camera.zoom
          : p.flight && visual && p.guided !== false
            ? pose.distance
            : p.flight && visual
              ? (pose.distance * (visual.camera?.zoom ?? p.camera.zoom)) /
                p.camera.zoom
              : 1670 / p.camera.zoom,
    center: {
      x:
        viewport.width *
          (p.flight || activeFocus || planeFocus || p.diagramOnly
            ? 0.5
            : 0.64) +
        activePan.x,
      y: viewport.height * 0.52 + activePan.y,
    },
  };
  const { onSpatialView } = p;
  useEffect(() => {
    if (visual?.previous) return;
    onSpatialView?.({
      target: {
        x: camera.target.x,
        y: camera.target.y - 28,
        z: camera.target.z,
      },
      distance: camera.distance,
      separation: orbit.separation,
      pan: { x: activePan.x, y: activePan.y },
    });
  }, [
    onSpatialView,
    camera.target.x,
    camera.target.y,
    camera.target.z,
    camera.distance,
    orbit.separation,
    activePan.x,
    activePan.y,
    visual?.previous,
  ]);
  const focusAt = useCallback(
    (
      initial: Perspective,
      id: string,
      label: string,
      point: Vector3,
      state = "ready",
      extent = 70,
    ) => {
      if (focusAnimation.current !== null)
        cancelAnimationFrame(focusAnimation.current);
      const target = { ...point, y: point.y + (extent === 70 ? 28 : 0) };
      const distance = focusDistance(
        viewport.width,
        viewport.height,
        extent,
        state === "layer",
      );
      const zoom = p.camera.zoom;
      const started = performance.now();
      setHovered(null);
      onCamera(p.camera);
      setOverview(null);
      setIsolated(null);
      setPan({ x: 0, y: 0, key: focusKey });
      const tick = (now: number) => {
        const t = p.reducedMotion ? 1 : Math.min(1, (now - started) / 800);
        const eased = t * t * (3 - 2 * t);
        setFocus({
          key: focusKey,
          target: mixVector(initial.target, target, eased),
          distance: initial.distance + (distance - initial.distance) * eased,
          zoom,
          separation: orbit.separation,
          id,
          label,
          state,
          inspect: true,
        });
        focusAnimation.current = t < 1 ? requestAnimationFrame(tick) : null;
      };
      focusAnimation.current = requestAnimationFrame(tick);
    },
    [
      viewport.width,
      viewport.height,
      p.camera,
      p.reducedMotion,
      onCamera,
      focusKey,
      orbit.separation,
    ],
  );
  const zoomScene = useCallback(
    (initial: { target: Vector3; distance: number }, factor: number) => {
      if (focusAnimation.current !== null)
        cancelAnimationFrame(focusAnimation.current);
      focusAnimation.current = null;
      const distance = zoomDistance(initial.distance, factor);
      const zoom = 1670 / distance;
      setOverview(null);
      setFocus({
        key: focusKey,
        target: initial.target,
        distance,
        zoom,
        separation: orbit.separation,
        id: activeFocus?.id ?? p.flight?.node ?? "nodes",
        label: activeFocus?.label ?? "Architecture",
        state: activeFocus?.state ?? "ready",
        inspect: activeFocus?.inspect ?? false,
      });
      setPan({ x: activePan.x, y: activePan.y, key: focusKey });
      onCamera({ x: 0, y: 0, zoom });
    },
    [
      focusKey,
      orbit.separation,
      activeFocus,
      activePan.x,
      activePan.y,
      p.flight?.node,
      onCamera,
    ],
  );
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta =
        event.deltaY *
        (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? viewport.height
            : 1);
      zoomScene(
        {
          target: {
            x: camera.target.x,
            y: camera.target.y,
            z: camera.target.z,
          },
          distance: camera.distance,
        },
        Math.exp(Math.max(-250, Math.min(250, delta)) * 0.002),
      );
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [
    camera.target.x,
    camera.target.y,
    camera.target.z,
    camera.distance,
    viewport.height,
    zoomScene,
  ]);
  function movePan(x: number, y: number) {
    onCamera(p.camera);
    setPan({ x: activePan.x + x, y: activePan.y + y, key: focusKey });
  }
  function resetView() {
    setHovered(null);
    setOverview(focusKey);
    if (focusAnimation.current !== null)
      cancelAnimationFrame(focusAnimation.current);
    focusAnimation.current = null;
    setFocus(null);
    setPan({ x: 0, y: 0, key: focusKey });
    setOrbit(defaultOrbit);
    setIsolated(null);
    onCamera({ x: 0, y: 0, zoom: 1 });
  }
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
  const labelCandidates: SceneLabel[] = [];
  const labelObstacles: LabelBox[] = [];
  const labelResources = new Map<
    string,
    { id: string; label: string; point: Vector3; state: string; role: string }
  >();
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
    const data = event.currentTarget.dataset;
    if (id && !drag.current?.moved)
      focusAt(
        camera,
        id,
        data.label ?? id,
        { x: Number(data.x), y: Number(data.y), z: Number(data.z) },
        data.state,
      );
  }
  function handleResourceKey(event: KeyboardEvent<SVGGElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    const data = event.currentTarget.dataset;
    if (data.conceptId)
      focusAt(
        camera,
        data.conceptId,
        data.label ?? data.conceptId,
        { x: Number(data.x), y: Number(data.y), z: Number(data.z) },
        data.state,
      );
  }
  function handleResourceHover(event: PointerEvent<SVGGElement>) {
    const data = event.currentTarget.dataset;
    setHovered({
      label: readableName(data.label ?? "Resource"),
      role: data.role ?? "",
      state: data.state ?? "ready",
      x: Math.max(12, Math.min(window.innerWidth - 300, event.clientX + 16)),
      y: Math.max(12, Math.min(window.innerHeight - 145, event.clientY + 16)),
    });
  }
  const focusResource = (id: string) =>
    (activeFocus?.inspect && activeFocus.id === conceptId(id)) ||
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
    const dimmed =
      hidden ||
      (p.layer !== "all" &&
        conceptById[conceptId(id)]?.layer !== p.layer &&
        !active);
    labelObstacles.push({
      x: q.x - 38 * q.scale,
      y: Math.min(q.y, top.y) - 18 * q.scale,
      width: 76 * q.scale,
      height: Math.abs(q.y - top.y) + 32 * q.scale,
    });
    if (
      !dimmed &&
      (!planned(id) || active) &&
      (id !== "pods" || camera.distance < 1000 || state !== "ready")
    ) {
      labelResources.set(id + label, {
        id: conceptId(id),
        label,
        point: pos,
        state,
        role: conceptById[conceptId(id)]?.summary ?? sub,
      });
      labelCandidates.push({
        id: id + label,
        text: readableName(label),
        color: tint,
        x: q.x,
        y: q.y,
        above: Math.min(q.y, top.y) - 18 * q.scale,
        priority:
          unavailable || state === "starting" || state === "pending"
            ? 100
            : active
              ? 90
              : id === "pods"
                ? 20
                : 60,
      });
    }
    add(
      id + label,
      pos,
      <g
        role="button"
        tabIndex={0}
        aria-label={`Focus ${label}: ${state}. ${sub || conceptById[conceptId(id)]?.summary || ""}. Open resource details from the focus toolbar.`}
        onClick={selectResource}
        onKeyDown={handleResourceKey}
        onPointerEnter={handleResourceHover}
        onPointerLeave={() => setHovered(null)}
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
        data-label={label}
        data-role={conceptById[conceptId(id)]?.summary ?? sub}
        data-x={pos.x}
        data-y={pos.y}
        data-z={pos.z}
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
        role="button"
        tabIndex={0}
        aria-label={`Focus ${plane.title}: ${plane.detail}`}
        onClick={() => {
          if (!drag.current?.moved)
            focusAt(
              camera,
              plane.node,
              plane.title,
              pos,
              "layer",
              Math.max(plane.w, plane.d),
            );
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            focusAt(
              camera,
              plane.node,
              plane.title,
              pos,
              "layer",
              Math.max(plane.w, plane.d),
            );
          }
        }}
        opacity={activeIsolation && activeIsolation !== plane.id ? 0.08 : 1}
      >
        {[
          { x: pos.x - plane.w, y: pos.y, z: pos.z - plane.d },
          { x: pos.x + plane.w, y: pos.y, z: pos.z - plane.d },
          { x: pos.x + plane.w, y: pos.y, z: pos.z + plane.d },
          { x: pos.x - plane.w, y: pos.y, z: pos.z + plane.d },
        ].every((point) => project(point, camera).visible) && (
          <polygon
            points={[
              { x: pos.x - plane.w, y: pos.y, z: pos.z - plane.d },
              { x: pos.x + plane.w, y: pos.y, z: pos.z - plane.d },
              { x: pos.x + plane.w, y: pos.y, z: pos.z + plane.d },
              { x: pos.x - plane.w, y: pos.y, z: pos.z + plane.d },
            ]
              .map((point) => {
                const q = project(point, camera);
                return `${q.x},${q.y}`;
              })
              .join(" ")}
            fill="transparent"
            className="spatial-plane-hit"
          />
        )}
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
        <g>
          <text
            x={label.x}
            y={label.y + 22}
            className="spatial-plane-label"
            fill={plane.color}
            display={activeIsolation === plane.id ? undefined : "none"}
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
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      orbit,
      pan: activePan,
      mode: e.shiftKey ? "pan" : dragMode,
      moved: false,
    };
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
      onCamera(p.camera);
      if (d.mode === "pan")
        setPan({ x: d.pan.x + x, y: d.pan.y + y, key: focusKey });
      else
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
        viewBox={`0 0 ${viewport.width} ${viewport.height}`}
        className={`universe-scene spatial-scene ${!labels ? "labels-hidden" : ""} ${dragMode === "pan" ? "pan-mode" : ""} ${p.motion ? "spatial-motion" : ""}`}
        role="group"
        aria-label="Three-dimensional Kubernetes architecture. Drag to orbit, shift-drag to pan, scroll to zoom. Click a resource or platform to focus it."
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
          cx={viewport.width / 2}
          cy={viewport.height / 2}
          rx={viewport.width / 2}
          ry={viewport.height / 2}
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
        {labels && (
          <g className="spatial-labels" aria-hidden="true">
            {placeLabels(
              labelCandidates,
              viewport.width,
              viewport.height,
              labelObstacles,
            ).map((label) => (
              <g
                key={label.id}
                className="spatial-nameplate"
                data-label={label.text}
                data-role={labelResources.get(label.id)?.role}
                data-state={labelResources.get(label.id)?.state}
                onPointerEnter={handleResourceHover}
                onPointerLeave={() => setHovered(null)}
                onClick={() => {
                  const resource = labelResources.get(label.id);
                  if (resource && !drag.current?.moved)
                    focusAt(
                      camera,
                      resource.id,
                      resource.label,
                      resource.point,
                      resource.state,
                    );
                }}
              >
                <path
                  d={`M${label.x} ${label.y + 9}L${label.box.x + label.box.width / 2} ${label.box.y > label.y ? label.box.y : label.box.y + label.box.height}`}
                  stroke="#668897"
                  strokeWidth=".8"
                  opacity=".6"
                  fill="none"
                  pointerEvents="none"
                />
                <rect
                  x={label.box.x}
                  y={label.box.y}
                  width={label.box.width}
                  height={label.box.height}
                  rx="6"
                  fill="#081b28"
                  fillOpacity=".94"
                  stroke={label.color}
                  strokeOpacity=".28"
                />
                <text
                  x={label.box.x + label.box.width / 2}
                  y={label.box.y + 16}
                  textAnchor="middle"
                  className="spatial-label"
                  fill={label.color}
                >
                  {label.text}
                </text>
              </g>
            ))}
          </g>
        )}
      </svg>
      {hovered && labels && (
        <aside
          className="spatial-hover-card"
          style={{ left: hovered.x, top: hovered.y }}
          role="status"
        >
          <strong>{hovered.label}</strong>
          <p>{hovered.role}</p>
          <small>{hovered.state.toUpperCase()} · Click to explore</small>
        </aside>
      )}
      {activeFocus?.inspect && labels && (
        <aside className="spatial-focus-readout" aria-live="polite">
          <span>RESOURCE IN FOCUS · {activeFocus.state.toUpperCase()}</span>
          <strong>{activeFocus.label}</strong>
          <p>{conceptById[activeFocus.id]?.summary}</p>
          <button onClick={() => p.onSelect(activeFocus.id)}>
            Explain this resource
          </button>
          <button onClick={resetView}>Whole architecture</button>
        </aside>
      )}
      <details
        className="spatial-tools"
        aria-label="Explore the three-dimensional architecture"
      >
        <summary>
          Camera &amp; labels <span>↗</span>
        </summary>
        <div className="spatial-modes">
          <button
            aria-pressed={dragMode === "orbit"}
            onClick={() => setDragMode("orbit")}
          >
            Orbit
          </button>
          <button
            aria-pressed={dragMode === "pan"}
            onClick={() => setDragMode("pan")}
          >
            Pan
          </button>
          <button
            aria-pressed={!labels}
            onClick={() => setLabels((value) => !value)}
          >
            {labels ? "Hide labels" : "Show labels"}
          </button>
        </div>
        {activeFocus?.inspect && (
          <button onClick={() => p.onSelect(activeFocus.id)}>
            Explain focused resource
          </button>
        )}
        <div className="spatial-pan-buttons" aria-label="Pan the architecture">
          <button aria-label="Pan left" onClick={() => movePan(-90, 0)}>
            ←
          </button>
          <button aria-label="Pan up" onClick={() => movePan(0, -90)}>
            ↑
          </button>
          <button aria-label="Pan down" onClick={() => movePan(0, 90)}>
            ↓
          </button>
          <button aria-label="Pan right" onClick={() => movePan(90, 0)}>
            →
          </button>
        </div>
        <div>
          <span>SPATIAL EXPLORER</span>
          <button onClick={resetView} title="Reset spatial view">
            Reset view
          </button>
        </div>
        <p>
          Drag to orbit · shift-drag to pan · scroll to zoom. Hover a name or
          model to learn its role. Names appear where there is space.
        </p>
        <label>
          Rotate{" "}
          <input
            aria-label="Rotate architecture"
            type="range"
            min="-3.14"
            max="3.14"
            step=".01"
            value={orbit.yaw}
            onChange={(e) => {
              onCamera(p.camera);
              setOrbit({ ...orbit, yaw: Number(e.target.value) });
            }}
          />
        </label>
        <label>
          Tilt{" "}
          <input
            aria-label="Tilt architecture"
            type="range"
            min="-1.4"
            max="1.4"
            step=".01"
            value={orbit.pitch}
            onChange={(e) => {
              onCamera(p.camera);
              setOrbit({ ...orbit, pitch: Number(e.target.value) });
            }}
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
            onChange={(e) => {
              onCamera(p.camera);
              setOrbit({ ...orbit, separation: Number(e.target.value) });
            }}
          />
        </label>
        <label className="spatial-isolate">
          Explore a layer
          <select
            aria-label="Isolate an architecture layer"
            value={activeIsolation ?? "all"}
            onChange={(e) => {
              setOverview(null);
              if (focusAnimation.current !== null)
                cancelAnimationFrame(focusAnimation.current);
              setFocus(null);
              setPan({ x: 0, y: 0, key: focusKey });
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
      </details>
      <div className="camera-tools" aria-label="Camera and playback controls">
        <button
          aria-label="Zoom in"
          onClick={() => zoomScene(camera, 1 / 1.2)}
          disabled={camera.distance <= 200}
        >
          +
        </button>
        <span>{Math.round((1670 / camera.distance) * 100)}%</span>
        <button
          aria-label="Zoom out"
          onClick={() => zoomScene(camera, 1.2)}
          disabled={camera.distance >= 8000}
        >
          −
        </button>
        <span className="tool-divider" />
        <button
          aria-label="Reset camera"
          title="Return to the whole architecture"
          onClick={resetView}
        >
          <Icon name="expand" size={16} />
        </button>
        {p.onTogglePaused && (
          <button
            aria-label={
              p.paused
                ? "Resume simulation and motion"
                : "Pause simulation and motion"
            }
            aria-pressed={p.paused}
            onClick={p.onTogglePaused}
          >
            <Icon name={p.paused ? "play" : "pause"} size={15} />
          </button>
        )}
      </div>
    </>
  );
}
