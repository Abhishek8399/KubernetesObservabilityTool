"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { conceptById, getColor, layers, type Layer } from "./data/concepts";
import {
  worldLinks,
  worldNodes,
  flowDenied,
  componentUnavailable,
  type WorldNode,
  type WorldLink,
} from "./data/world";
import {
  zoneReadyCounts,
  type Simulation,
  type Scenario,
} from "./lib/simulation";

import { explainConnection } from "./data/connections";
import type { FlightVisual } from "./use-flight-camera";
import {
  flightPoint,
  isLogicalStop,
  panCamera,
  type Point,
} from "./lib/flight";
import { visiblePods, type LabFrame } from "./lib/lab";

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}
export type SceneProps = {
  scenario: Scenario;
  lab: LabFrame;
  highlights: string[];
  simulation: Simulation;
  selected: string | null;
  focus: string | null;
  layer: Layer | "all";
  motion: boolean;
  recovery: boolean;
  camera: Camera;
  guided?: boolean;
  flight?: {
    visual: FlightVisual | null;
    destination: Point;
    node: string;
    phase: string;
    stopKey: string;
  };
  onCamera: (camera: Camera) => void;
  onSelect: (id: string) => void;
  onConnection: (link: WorldLink) => void;
};
const coordinates = Object.fromEntries(
  worldNodes.map((n) => [n.id, { x: n.x, y: n.y }]),
);
coordinates.pods = { x: 1100, y: 835 };
coordinates.nodes = { x: 1100, y: 780 };

function Platform({
  x,
  y,
  w,
  d,
  color,
  label,
}: {
  x: number;
  y: number;
  w: number;
  d: number;
  color: string;
  label?: string;
}) {
  return (
    <g className="world-platform">
      <ellipse
        cx={x}
        cy={y + 60}
        rx={w * 0.9}
        ry={d * 0.9}
        fill="#000b12"
        opacity=".55"
        filter="url(#soft-shadow)"
      />
      <path
        d={`M${x - w} ${y} ${x} ${y + d} ${x + w} ${y}v18L${x} ${y + d + 18} ${x - w} ${y + 18}Z`}
        fill="#0a1929"
        stroke={color}
        strokeOpacity=".2"
      />
      <path
        d={`M${x - w} ${y} ${x} ${y - d} ${x + w} ${y} ${x} ${y + d}Z`}
        fill="url(#platform-face)"
        stroke={color}
        strokeOpacity=".42"
      />
      {[0.25, 0.5, 0.75].map((v) => (
        <g key={v} stroke={color} strokeOpacity=".065">
          <path d={`M${x - w + w * v} ${y - d * v}l${w} ${d}`} />
          <path d={`M${x - w + w * v} ${y + d * v}l${w} -${d}`} />
        </g>
      ))}
      <path
        d={`M${x - w} ${y + 2} ${x} ${y + d + 2} ${x + w} ${y + 2}`}
        fill="none"
        stroke={color}
        strokeOpacity=".4"
        strokeWidth="2"
      />
      {label && (
        <text
          x={x}
          y={y + d - 15}
          textAnchor="middle"
          className="platform-label"
          fill={color}
        >
          {label}
        </text>
      )}
    </g>
  );
}

export function Artifact({
  shape,
  layer,
  large = false,
  namespace = "",
}: {
  shape: WorldNode["shape"];
  layer: Layer;
  large?: boolean;
  namespace?: string;
}) {
  const c = getColor(layer),
    scale = large ? 2.2 : 1;
  const gradient = `${namespace}${layer}`;
  return (
    <g transform={`scale(${scale})`}>
      <ellipse cy="7" rx="61" ry="24" fill={c} opacity=".07" />
      <ellipse
        cy="4"
        rx="47"
        ry="18"
        fill="none"
        stroke={c}
        strokeOpacity=".35"
      />
      {shape === "orb" ? (
        <>
          <ellipse
            cy="-40"
            rx="45"
            ry="42"
            fill={`url(#${gradient}-orb)`}
            stroke={c}
            strokeOpacity=".7"
          />
          <ellipse
            cy="-40"
            rx="45"
            ry="16"
            fill="none"
            stroke={c}
            strokeOpacity=".5"
          />
          <ellipse
            cy="-40"
            rx="17"
            ry="42"
            fill="none"
            stroke={c}
            strokeOpacity=".5"
          />
          <path
            d="M-45-40H45M-34-67H34M-34-13H34"
            stroke={c}
            strokeOpacity=".4"
          />
          <circle cy="-40" r="5" fill={c} filter={`url(#${namespace}bloom)`} />
        </>
      ) : shape === "database" ? (
        <>
          <path
            d="M-37-70V-8C-37 16 37 16 37-8V-70Z"
            fill={`url(#${gradient}-front)`}
            stroke={c}
            strokeOpacity=".6"
          />
          <ellipse
            cy="-70"
            rx="37"
            ry="16"
            fill={`url(#${gradient}-top)`}
            stroke={c}
          />
          <ellipse
            cy="-70"
            rx="24"
            ry="9"
            fill="none"
            stroke={c}
            strokeOpacity=".5"
          />
          {[-47, -25, -5].map((y) => (
            <path
              key={y}
              d={`M-37 ${y}C-37 ${y + 22} 37 ${y + 22} 37 ${y}`}
              fill="none"
              stroke={c}
              strokeOpacity=".5"
            />
          ))}
          <circle cx="-18" cy="-28" r="2" fill={c} />
        </>
      ) : shape === "portal" ? (
        <>
          <path
            d="M-44 0V-76L0-97 44-76V0L0 21Z"
            fill={`url(#${gradient}-front)`}
            stroke={c}
            strokeOpacity=".65"
          />
          <path d="M0-97 44-76V0L0 21V-97Z" fill="#071d2b" fillOpacity=".65" />
          <path
            d="M-30-8V-65L0-80 30-65V-8L0 7Z"
            fill="#071321"
            stroke={c}
            strokeWidth="2"
          />
          <path d="M0-80V7M-30-65 0-50 30-65" stroke={c} strokeOpacity=".35" />
          <path
            d="M-18-36H17M8-45 17-36 8-27"
            stroke={c}
            strokeWidth="2"
            fill="none"
          />
          <circle cy="-36" r="4" fill={c} filter={`url(#${namespace}bloom)`} />
        </>
      ) : (
        <>
          <path
            d={`M-39-64 0-84 39-64 0-44Z`}
            fill={`url(#${gradient}-top)`}
            stroke={c}
            strokeOpacity=".9"
          />
          <path
            d="M-39-64V-5L0 15V-44Z"
            fill={`url(#${gradient}-front)`}
            stroke={c}
            strokeOpacity=".45"
          />
          <path
            d="M0-44 39-64V-5L0 15Z"
            fill={`url(#${gradient}-side)`}
            stroke={c}
            strokeOpacity=".3"
          />
          {shape === "tower" ? (
            <>
              {[-49, -35, -21].map((y) => (
                <g key={y}>
                  <path
                    d={`M-32 ${y}l24 12v6l-24-12Z`}
                    fill="#040b15"
                    stroke={c}
                    strokeOpacity=".18"
                  />
                  <path
                    d={`M7 ${y + 18}l24-12`}
                    stroke={c}
                    strokeOpacity=".32"
                  />
                  <circle cx="-27" cy={y + 4} r="1.5" fill={c} />
                </g>
              ))}
              <path
                d="M-19-65 0-75 19-65 0-55Z"
                fill="none"
                stroke={c}
                strokeOpacity=".7"
              />
            </>
          ) : (
            <>
              <path d="M-15-65 0-73 15-65 0-57Z" fill="none" stroke={c} />
              <path
                d="M0-57v12M-15-65v13M15-65v13"
                stroke={c}
                strokeOpacity=".6"
              />
              <circle cx="-23" cy="-25" r="2" fill={c} />
            </>
          )}
        </>
      )}
    </g>
  );
}

export function SceneDefinitions({ namespace = "" }: { namespace?: string }) {
  return (
    <defs>
      <linearGradient
        id={`${namespace}platform-face`}
        x1="0"
        y1="0"
        x2="1"
        y2="1"
      >
        <stop stopColor="#1c3047" />
        <stop offset=".55" stopColor="#102337" />
        <stop offset="1" stopColor="#0a1b2a" />
      </linearGradient>
      <radialGradient id={`${namespace}world-halo`}>
        <stop stopColor="#4aaca2" stopOpacity=".12" />
        <stop offset="1" stopColor="#4aaca2" stopOpacity="0" />
      </radialGradient>
      <filter
        id={`${namespace}soft-shadow`}
        x="-50%"
        y="-100%"
        width="200%"
        height="300%"
      >
        <feGaussianBlur stdDeviation="20" />
      </filter>
      <filter
        id={`${namespace}bloom`}
        x="-150%"
        y="-150%"
        width="400%"
        height="400%"
      >
        <feGaussianBlur stdDeviation="3" />
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <pattern
        id={`${namespace}world-grid`}
        width="80"
        height="46"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M0 23 40 0 80 23 40 46Z"
          fill="none"
          stroke="#9dced1"
          strokeOpacity=".045"
        />
      </pattern>
      {layers
        .filter((l) => l.id !== "all")
        .map((l) => (
          <g key={l.id}>
            <linearGradient id={`${namespace}${l.id}-top`} x2="0" y2="1">
              <stop stopColor={l.color} stopOpacity=".8" />
              <stop offset="1" stopColor={l.color} stopOpacity=".25" />
            </linearGradient>
            <linearGradient id={`${namespace}${l.id}-front`} x2="1" y2="1">
              <stop stopColor={l.color} stopOpacity=".34" />
              <stop offset="1" stopColor={l.color} stopOpacity=".08" />
            </linearGradient>
            <linearGradient id={`${namespace}${l.id}-side`} x2="1" y2="1">
              <stop stopColor={l.color} stopOpacity=".18" />
              <stop offset="1" stopColor="#07111f" />
            </linearGradient>
            <radialGradient id={`${namespace}${l.id}-orb`} cx=".3" cy=".2">
              <stop stopColor={l.color} stopOpacity=".4" />
              <stop offset="1" stopColor="#091b2b" stopOpacity=".95" />
            </radialGradient>
          </g>
        ))}
    </defs>
  );
}

function selectable(id: string, label: string, onSelect: (id: string) => void) {
  return {
    role: "button",
    tabIndex: 0,
    "aria-label": `Explore ${label}`,
    onClick: () => onSelect(id),
    onPointerDown: (e: PointerEvent<SVGGElement>) => e.stopPropagation(),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(id);
      }
    },
  };
}

export default function ArchitectureScene(props: SceneProps) {
  const svg = useRef<SVGSVGElement>(null),
    drag = useRef<{
      x: number;
      y: number;
      camera: Camera;
      ratio: number;
    } | null>(null);
  const {
    simulation: s,
    selected,
    focus,
    layer,
    motion,
    recovery,
    camera,
    onCamera,
    onSelect,
  } = props;
  const regionLost = s.nodes === 0;
  const creationAt: Record<string, number> = {
    deployment: 4,
    pods: 5,
    service: 9,
    gateway: 13,
    loadbalancer: 13,
    waf: 13,
    hpa: 15,
    observability: 16,
    pvc: 19,
  };
  const planned = (id: string) =>
    !!props.lab.learning && (creationAt[id] ?? 0) > props.lab.learning.step;
  const actorActive = (id: string) =>
    props.highlights.includes(id) || focus === id;
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const zoom = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      onCamera({
        ...camera,
        zoom: Math.max(0.65, Math.min(3.4, camera.zoom - event.deltaY * 0.002)),
      });
    };
    element.addEventListener("wheel", zoom, { passive: false });
    return () => element.removeEventListener("wheel", zoom);
  }, [camera, onCamera]);

  function pointerDown(e: PointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    const box = svg.current!.getBoundingClientRect();
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      camera,
      ratio: Math.max(1800 / box.width, 1060 / box.height),
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function pointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!drag.current) return;
    const d = drag.current;
    onCamera(
      panCamera(d.camera, {
        x: (e.clientX - d.x) * d.ratio,
        y: (e.clientY - d.y) * d.ratio,
      }),
    );
  }
  return (
    <svg
      ref={svg}
      className={`universe-scene ${motion ? "" : "motion-off"}`}
      viewBox="0 100 1800 1060"
      aria-label="Kubernetes architecture world. Drag the background to pan; use zoom controls or Control plus scroll."
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <SceneDefinitions />
      <g
        transform={`translate(${camera.x} ${camera.y}) translate(900 580) scale(${camera.zoom}) translate(-900 -580)`}
      >
        <ellipse cx="1110" cy="725" rx="700" ry="540" fill="url(#world-halo)" />
        <rect
          x="60"
          y="70"
          width="1670"
          height="1060"
          fill="url(#world-grid)"
        />
        <ellipse
          cx="1110"
          cy="660"
          rx="675"
          ry="415"
          fill="none"
          stroke="#91dcd3"
          strokeOpacity=".09"
          strokeDasharray="3 12"
        />
        <text x="680" y="132" className="region-label">
          {regionLost ? "PRIMARY CLUSTER OFFLINE" : "KUBERNETES CLUSTER"}
        </text>
        <text x="680" y="153" className="region-sub">
          Logical architecture · illustrative failure domains
        </text>
        <Platform
          x={1100}
          y={370}
          w={485}
          d={185}
          color="#b8a3ff"
          label="01 ? CONTROL PLANE: KEEP DESIRED STATE"
        />
        <Platform
          x={1100}
          y={565}
          w={535}
          d={150}
          color="#67dfd0"
          label="02 ? NETWORK: ROUTE TO READY BACKENDS"
        />
        <Platform x={1100} y={855} w={530} d={182} color="#89b4ff" />
        <text
          x="1100"
          y="1010"
          textAnchor="middle"
          className="platform-label"
          fill="#8db9e7"
        >
          03 ? WORKER POOL: RUN APPLICATION CONTAINERS
        </text>
        <g className="world-connections">
          {worldLinks
            .filter(
              (link) =>
                !(link.from === "service" && link.to === "pods") &&
                !planned(link.from) &&
                !planned(link.to),
            )
            .map((link, index) => {
              const a = coordinates[link.from],
                b = coordinates[link.to],
                traffic = link.kind === "traffic",
                active = actorActive(link.from) || actorActive(link.to);
              const denied = flowDenied(link, props.scenario, s);
              const d = `M${a.x} ${a.y + 12}C${a.x} ${(a.y + b.y) / 2 + 45} ${b.x} ${(a.y + b.y) / 2 + 45} ${b.x} ${b.y + 12}`;
              return (
                <g
                  key={`${link.from}-${link.to}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Explain connection: ${explainConnection(link).title}`}
                  onClick={() => props.onConnection(link)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      props.onConnection(link);
                    }
                  }}
                  className={`connection-focus world-link ${link.kind} ${active ? "link-active" : ""} ${denied ? "link-denied" : ""}`}
                >
                  <title>{`${explainConnection(link).title}: ${explainConnection(link).body}`}</title>
                  <path
                    d={d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="16"
                    className="wire-hit-target"
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke={
                      denied
                        ? "#ef829c"
                        : traffic
                          ? "#7de8d4"
                          : link.kind === "control"
                            ? "#b8a3ff"
                            : "#819cba"
                    }
                    strokeOpacity={active ? 0.9 : traffic ? 0.5 : 0.2}
                    strokeWidth={active ? 2.5 : 1.4}
                    strokeDasharray={
                      traffic
                        ? undefined
                        : link.kind === "control"
                          ? "5 6"
                          : "2 7"
                    }
                  />
                  {link.kind === "control" &&
                    props.lab.index === 2 &&
                    active &&
                    motion && (
                      <rect
                        x="-3"
                        y="-3"
                        width="6"
                        height="6"
                        rx="1"
                        fill="#d1baff"
                      >
                        <animateMotion
                          path={d}
                          dur="4s"
                          repeatCount="indefinite"
                          begin={`${-index * 0.3}s`}
                        />
                      </rect>
                    )}
                  {traffic && !denied && motion && (
                    <circle
                      r={active ? 3.5 : 2.5}
                      fill="#adf6e4"
                      filter="url(#bloom)"
                    >
                      <animateMotion
                        dur={`${3 + (index % 3)}s`}
                        repeatCount="indefinite"
                        path={d}
                        begin={`${-index * 0.7}s`}
                      />
                    </circle>
                  )}
                </g>
              );
            })}
          {recovery && (
            <path
              d="M505 602C620 1120 1400 1140 1640 1000"
              fill="none"
              stroke="#8bdbac"
              strokeWidth={s.secondaryActive ? 5 : 1}
              strokeOpacity={s.secondaryActive ? 0.8 : 0.25}
              strokeDasharray="6 8"
              className={s.secondaryActive ? "standby-flow" : ""}
            />
          )}
        </g>
        <g
          className="endpoint-routes"
          aria-label="Service backends selected by readiness"
        >
          {[810, 1100, 1390].flatMap((x, zone) =>
            visiblePods(props.scenario, props.lab, zone)
              .filter(() => !planned("service"))
              .map((pod) => {
                const px = pod.slot % 2 === 0 ? 16 : 78,
                  py = pod.slot < 2 ? -4 : 44;
                const targetX = x + px,
                  targetY = 835 + py - 25;
                const serving =
                  pod.state === "ready" &&
                  !flowDenied(
                    { from: "service", to: "pods", kind: "traffic" },
                    props.scenario,
                    s,
                  );
                const frontend =
                  !!props.lab.learning && !["A1", "B1"].includes(pod.id);
                const startX = frontend ? 1090 : 965,
                  startY = frontend ? 615 : 512;
                const d = `M${startX} ${startY}C${startX} 665 ${targetX} 685 ${targetX} ${targetY}`;
                return (
                  <g
                    key={pod.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Explain ${frontend ? "frontend" : props.lab.learning ? "API" : "application"} Service endpoint ${pod.id}`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() =>
                      props.onConnection({
                        from: "service",
                        to: "pods",
                        kind: "traffic",
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        props.onConnection({
                          from: "service",
                          to: "pods",
                          kind: "traffic",
                        });
                      }
                    }}
                    data-endpoint={pod.id}
                    data-service-owner={
                      props.lab.learning
                        ? frontend
                          ? "frontend"
                          : "api"
                        : undefined
                    }
                    data-state={
                      serving
                        ? "serving"
                        : pod.state === "ready"
                          ? "blocked"
                          : "withdrawn"
                    }
                  >
                    <title>{`${pod.id}: ${serving ? "Ready endpoint receives requests" : "Not eligible for this request path"}`}</title>
                    <path
                      d={d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="13"
                      className="wire-hit-target"
                    />
                    <path
                      d={d}
                      fill="none"
                      stroke={
                        serving
                          ? "#79dcbf"
                          : pod.state === "starting" || pod.state === "pending"
                            ? "#f0c27a"
                            : "#f5849e"
                      }
                      strokeOpacity={serving ? 0.5 : 0.24}
                      strokeWidth={serving ? 2 : 1.5}
                      strokeDasharray={serving ? undefined : "5 9"}
                    />
                    {serving && motion && (
                      <circle r="3" fill="#b5f7d7">
                        <animateMotion
                          path={d}
                          dur={
                            props.scenario === "traffic-spike" ? "1.4s" : "3s"
                          }
                          repeatCount="indefinite"
                          begin={`${-pod.slot * 0.6 - zone * 0.8}s`}
                        />
                      </circle>
                    )}
                    {!serving && (
                      <path
                        d={`M${targetX - 6} ${targetY - 6}l12 12m0-12-12 12`}
                        stroke={
                          pod.state === "pending" || pod.state === "starting"
                            ? "#efc57c"
                            : "#f5849e"
                        }
                        strokeWidth="2"
                      />
                    )}
                  </g>
                );
              }),
          )}
        </g>
        {worldNodes
          .filter((n) => n.id !== "dr" || recovery)
          .map((n) => {
            const current = selected === n.id || actorActive(n.id),
              faded = layer !== "all" && n.layer !== layer;
            const failed = componentUnavailable(n, props.scenario, s);
            const blocked =
              n.id === "networkpolicy" &&
              props.scenario === "policy-block" &&
              !s.serviceAvailable;
            return (
              <g
                data-provisioning={planned(n.id) ? "planned" : "created"}
                data-component={n.id}
                data-state={
                  failed ? "unavailable" : blocked ? "denying" : "available"
                }
                key={n.id}
                transform={`translate(${n.x} ${n.y})`}
                {...selectable(n.id, conceptById[n.id].title, onSelect)}
                className={`scene-object ${planned(n.id) ? "resource-planned" : ""} ${current ? "object-active" : ""} ${faded ? "object-faded" : ""} ${failed ? "object-failed" : ""}`}
                style={{ "--object-color": getColor(n.layer) } as CSSProperties}
              >
                <title>
                  {`${conceptById[n.id].title}: ${conceptById[n.id].summary}`}
                </title>
                {current && (
                  <>
                    <ellipse
                      cy="2"
                      rx="67"
                      ry="27"
                      fill="none"
                      stroke={getColor(n.layer)}
                      strokeWidth="2"
                      className="selection-ring"
                    />
                    <path
                      d="M0-130V-104"
                      stroke={getColor(n.layer)}
                      strokeDasharray="3 4"
                    />
                    <circle
                      cy="-135"
                      r="4"
                      fill={getColor(n.layer)}
                      filter="url(#bloom)"
                    />
                  </>
                )}
                {failed && (
                  <ellipse cy="-42" rx="63" ry="66" className="fault-aura" />
                )}
                {n.id === "dr" ? (
                  <g
                    className={`standby-cluster ${s.secondaryActive ? "standby-promoted" : "standby-waiting"}`}
                  >
                    <Platform x={0} y={-4} w={118} d={47} color="#8bdbac" />
                    <g transform="translate(-60 -8)">
                      <Artifact shape="tower" layer="operations" />
                    </g>
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <g
                        key={index}
                        transform={`translate(${(index % 3) * 34} ${index < 3 ? -20 : 13}) scale(.4)`}
                        data-standby-backend={index + 1}
                        data-state={
                          s.secondaryActive ? "serving" : "not-promoted"
                        }
                      >
                        <Artifact shape="cube" layer="operations" />
                        <circle
                          cy="-66"
                          r="5"
                          fill={s.secondaryActive ? "#c5ffd2" : "#a6a086"}
                        />
                      </g>
                    ))}
                    <text
                      y="-138"
                      textAnchor="middle"
                      className="standby-label"
                    >
                      SEPARATE CLUSTER
                    </text>
                  </g>
                ) : (
                  <Artifact shape={n.shape} layer={n.layer} />
                )}
                {current &&
                  props.lab.index === 2 &&
                  ["controllers", "scheduler", "hpa"].includes(n.id) && (
                    <g className="actor-working">
                      <ellipse
                        cy="-38"
                        rx="55"
                        ry="25"
                        fill="none"
                        stroke="#c5afff"
                        strokeWidth="3"
                        strokeDasharray="7 9"
                      />
                      <text y="-111" textAnchor="middle">
                        {n.id === "controllers"
                          ? "RECONCILING"
                          : n.id === "scheduler"
                            ? "PLACING PODS"
                            : `DESIRED: ${s.desired}`}
                      </text>
                    </g>
                  )}
                <text
                  y={n.id === "dr" ? 80 : 46}
                  textAnchor="middle"
                  className="object-title"
                >
                  {props.lab.learning && n.id === "service"
                    ? "API SERVICE"
                    : n.label}
                </text>
                <text
                  y={n.id === "dr" ? 100 : 66}
                  textAnchor="middle"
                  className="object-subtitle"
                >
                  {n.sub}
                </text>
                {failed && (
                  <text y="-110" textAnchor="middle" className="failure-label">
                    {n.id === "database" ? "DEPENDENCY DOWN" : "OFFLINE"}
                  </text>
                )}
                {blocked && (
                  <text y="-110" textAnchor="middle" className="failure-label">
                    DENYING FLOW
                  </text>
                )}
                {n.id === "dr" && s.secondaryActive && (
                  <text y="-110" textAnchor="middle" className="recovery-label">
                    STANDBY SERVING
                  </text>
                )}
              </g>
            );
          })}
        {[810, 1100, 1390].map((x, zone) => {
          const failed = regionLost || s.failedZone === zone,
            count = zoneReadyCounts(s)[zone];
          return (
            <g
              key={zone}
              transform={`translate(${x} 835)`}
              className={`worker-island ${failed ? "zone-failed" : ""} ${layer !== "all" && layer !== "workload" ? "object-faded" : ""}`}
              data-zone={String.fromCharCode(65 + zone)}
              data-state={failed ? "offline" : "available"}
            >
              <Platform
                x={0}
                y={12}
                w={129}
                d={68}
                color={failed ? "#f488a4" : "#81accf"}
              />
              {failed && (
                <g className="zone-failure-banner">
                  <path
                    d="M-129 12 0-56 129 12 0 80Z"
                    fill="#f2709433"
                    stroke="#f98aa8"
                    strokeWidth="3"
                  />
                  <text y="-131" textAnchor="middle">
                    ZONE {String.fromCharCode(65 + zone)} OFFLINE
                  </text>
                  <text
                    y="-107"
                    textAnchor="middle"
                    className="zone-failure-sub"
                  >
                    {regionLost
                      ? "Primary region lost"
                      : "Node and 2 Pods unavailable"}
                  </text>
                </g>
              )}
              <g
                transform="translate(-56 -10)"
                className="scene-object worker-node"
                data-node-state={failed ? "offline" : "ready"}
                {...selectable(
                  "nodes",
                  `worker node in zone ${zone + 1}`,
                  onSelect,
                )}
              >
                <Artifact shape="tower" layer="workload" />
                {failed && (
                  <path
                    d="M-23-63 23-17m0-46-46 46"
                    stroke="#ffacc0"
                    strokeWidth="5"
                  />
                )}
                <text x="-12" y="39" className="worker-label">
                  NODE {zone + 1}
                </text>
              </g>
              {visiblePods(props.scenario, props.lab, zone).map((pod) => {
                const px = pod.slot % 2 === 0 ? 16 : 78,
                  py = pod.slot < 2 ? -4 : 44;
                return (
                  <g
                    key={pod.id}
                    transform={`translate(${px} ${py})`}
                    className={`scene-object pod-artifact pod-${pod.state} ${selected === "pods" || actorActive("pods") ? "object-active" : ""}`}
                    data-pod={pod.id}
                    data-workload={
                      props.lab.learning
                        ? ["A1", "B1"].includes(pod.id)
                          ? "api"
                          : "frontend"
                        : undefined
                    }
                    data-pod-state={pod.state}
                    data-version={pod.version}
                    {...selectable(
                      "pods",
                      `Pod ${pod.id}${pod.replacement ? " replacement" : ""}: ${pod.state}, ${pod.version}`,
                      onSelect,
                    )}
                  >
                    <g transform="scale(.62)">
                      <Artifact
                        shape="cube"
                        layer={pod.version === "v2" ? "operations" : "workload"}
                      />
                      {pod.state !== "ready" && (
                        <>
                          <ellipse
                            cy="-30"
                            rx="46"
                            ry="45"
                            className="pod-state-halo"
                          />
                          <path
                            d={
                              pod.state === "lost" || pod.state === "offline"
                                ? "M-20-59 20-19m0-40-40 40"
                                : "M-15-50h30m-25 13h20m-15 13h10"
                            }
                            className="pod-state-mark"
                          />
                        </>
                      )}
                      <circle cy="-65" r="5" className="pod-status-dot" />
                    </g>
                    <text y="22" textAnchor="middle" className="pod-identity">
                      {props.lab.learning
                        ? ["A1", "B1"].includes(pod.id)
                          ? "API "
                          : "WEB "
                        : ""}
                      {pod.id}
                      {pod.replacement ? "?" : ""} ?{" "}
                      {pod.state === "ready"
                        ? props.scenario === "rollout"
                          ? pod.version
                          : "READY"
                        : pod.state.toUpperCase()}
                    </text>
                  </g>
                );
              })}
              <g
                className="scene-object"
                {...selectable(
                  "affinity",
                  `failure domain ${zone + 1}`,
                  onSelect,
                )}
              >
                <text y="117" textAnchor="middle" className="zone-label">
                  ZONE {String.fromCharCode(65 + zone)}{" "}
                  <tspan fill={failed ? "#ffa7bd" : "#a8e8c6"}>
                    /{" "}
                    {failed ? "0 READY ENDPOINTS" : `${count} READY ENDPOINTS`}
                  </tspan>
                </text>
              </g>
            </g>
          );
        })}
        {s.nodes === 4 && (
          <g className="extra-capacity" transform="translate(1520 925)">
            <Artifact shape="tower" layer="operations" />
            <text y="-110" textAnchor="middle" className="recovery-label">
              NODE 4 JOINS
            </text>
            <text y="46" textAnchor="middle" className="recovery-label">
              +1 NODE / NEW CAPACITY
            </text>
          </g>
        )}
        {props.flight && (
          <FlightCraft flight={props.flight} onSelect={onSelect} />
        )}
        {props.lab.learning && props.lab.learning.step >= 10 && (
          <g
            transform="translate(1090 603)"
            className="scene-object"
            data-component="frontend-service"
            {...selectable(
              "service",
              "Frontend Service: two frontend backends",
              onSelect,
            )}
          >
            <Artifact shape="orb" layer="network" />
            <text y="46" textAnchor="middle" className="object-title">
              FRONTEND SERVICE
            </text>
            <text y="66" textAnchor="middle" className="object-sub">
              Frontend selectors only
            </text>
          </g>
        )}
        {props.lab.learning && props.lab.learning.step >= 13 && (
          <g
            className="world-link traffic"
            data-course-route="frontend"
            role="button"
            tabIndex={0}
            aria-label="Gateway route to the frontend Service"
            onClick={() =>
              props.onConnection({
                from: "gateway",
                to: "service",
                kind: "traffic",
              })
            }
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                props.onConnection({
                  from: "gateway",
                  to: "service",
                  kind: "traffic",
                });
              }
            }}
          >
            <path
              d="M745 517C800 560 1010 560 1090 615"
              fill="none"
              stroke="transparent"
              strokeWidth="16"
            />
            <path
              d="M745 517C800 560 1010 560 1090 615"
              fill="none"
              stroke="#7de8d4"
              strokeWidth="2"
              strokeOpacity=".6"
            />
            <title>
              The implemented gateway routes frontend traffic to the frontend
              Service; API traffic uses its separate Service.
            </title>
          </g>
        )}
        <g className="world-annotation">
          <text x="97" y="695">
            NORTH–SOUTH TRAFFIC
          </text>
          <path d="M100 705H290" stroke="#6e9cb0" strokeOpacity=".3" />
          <text x="88" y="1120">
            DELIVERY / ARTIFACT SUPPLY
          </text>
          <text x="620" y="1130">
            A SYSTEM OF RECONCILIATION, NOT A SINGLE PRODUCT.
          </text>
        </g>
      </g>
    </svg>
  );
}

export function FlightCraft({
  flight,
  onSelect,
}: {
  flight: NonNullable<SceneProps["flight"]>;
  onSelect: (id: string) => void;
}) {
  const { visual, destination, node, phase } = flight;
  const color = getColor(conceptById[node].layer);
  const returning = phase === "Response returns";
  const from = visual?.from ?? destination;
  const course = Array.from({ length: 45 }, (_, i) =>
    flightPoint(from, destination, i / 44),
  );
  const trail = visual
    ? Array.from({ length: 16 }, (_, i) =>
        flightPoint(
          from,
          destination,
          Math.max(0, visual.travelProgress - i * 0.015),
        ),
      )
    : [];
  return (
    <g
      className={`flight-world ${returning ? "flight-return" : ""}`}
      data-flight-resource={node}
      data-flight-phase={visual?.phase ?? "Plotting course"}
      pointerEvents="none"
    >
      <path
        d={course.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ")}
        className="flight-course"
        stroke={returning ? "#ffc891" : color}
      />
      <g
        transform={`translate(${destination.x} ${destination.y})`}
        className="flight-destination"
      >
        <ellipse
          rx="95"
          ry="42"
          cy="40"
          stroke={color}
          className="destination-ring"
        />
        <ellipse
          rx="78"
          ry="34"
          cy="40"
          stroke={color}
          className="destination-ring-inner"
        />
        <path
          d="M-70-80h-20v20M70-80h20v20M-70 76h-20v-20M70 76h20v-20"
          stroke={color}
          className="destination-brackets"
        />
        {isLogicalStop(node) && (
          <g
            className="logical-resource-beacon"
            pointerEvents="auto"
            {...selectable(node, conceptById[node].title, onSelect)}
          >
            <path d="M0-87v-46" stroke={color} strokeDasharray="3 4" />
            <rect
              x="-124"
              y="-176"
              width="248"
              height="43"
              rx="8"
              fill="#071c29"
              stroke={color}
            />
            <text y="-149" textAnchor="middle" fill={color}>
              {conceptById[node].title}
            </text>
          </g>
        )}
      </g>
      {visual && (
        <>
          {trail.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3 - i * 0.13}
              fill={returning ? "#ffc891" : "#a5fff1"}
              opacity={(1 - i / 16) * 0.6}
            />
          ))}
          <g
            transform={`translate(${visual.ship.x} ${visual.ship.y - 12}) rotate(${visual.angle})`}
            className="flight-ship"
            data-flight-progress={visual.progress}
          >
            <path
              d="M-20-4L-52 0-20 4"
              fill={returning ? "#ffc891" : "#76eee6"}
              className="ship-exhaust"
            />
            <path
              d="M25 0-15-13-8-3-19 0-8 3-15 13Z"
              fill="#ecffff"
              stroke="#8fcfcf"
              strokeWidth="1.4"
            />
            <path d="M10 0-6-4-3 0-6 4Z" fill="#1f7188" />
            <circle cx="-17" cy="0" r="2.4" fill="#fff" />
          </g>
        </>
      )}
    </g>
  );
}
