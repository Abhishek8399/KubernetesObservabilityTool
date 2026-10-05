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
} from "./data/world";
import {
  zoneReadyCounts,
  type Simulation,
  type Scenario,
} from "./lib/simulation";

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}
type SceneProps = {
  scenario: Scenario;
  simulation: Simulation;
  selected: string | null;
  focus: string | null;
  layer: Layer | "all";
  motion: boolean;
  recovery: boolean;
  camera: Camera;
  onCamera: (camera: Camera) => void;
  onSelect: (id: string) => void;
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
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const zoom = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      onCamera({
        ...camera,
        zoom: Math.max(0.65, Math.min(2, camera.zoom - event.deltaY * 0.002)),
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
      ratio: Math.max(1800 / box.width, 1160 / box.height),
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function pointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!drag.current) return;
    const d = drag.current;
    onCamera({
      ...camera,
      x: Math.max(
        -850,
        Math.min(850, d.camera.x + (e.clientX - d.x) * d.ratio),
      ),
      y: Math.max(
        -650,
        Math.min(650, d.camera.y + (e.clientY - d.y) * d.ratio),
      ),
    });
  }
  return (
    <svg
      ref={svg}
      className={`universe-scene ${motion ? "" : "motion-off"}`}
      viewBox="0 0 1800 1160"
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
          01 / PRIMARY CLUSTER
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
          label="CONTROL PLANE / DESIRED STATE"
        />
        <Platform
          x={1100}
          y={565}
          w={535}
          d={150}
          color="#67dfd0"
          label="NETWORKING / IMPLEMENTED DATA PLANE"
        />
        <Platform x={1100} y={855} w={530} d={182} color="#89b4ff" />
        <text
          x="1100"
          y="1010"
          textAnchor="middle"
          className="platform-label"
          fill="#8db9e7"
        >
          WORKER POOL / APPLICATION CAPACITY
        </text>
        <g className="world-connections">
          {worldLinks.map((link, index) => {
            const a = coordinates[link.from],
              b = coordinates[link.to],
              traffic = link.kind === "traffic",
              active = focus && (focus === link.from || focus === link.to);
            const denied = flowDenied(link, props.scenario, s);
            const d = `M${a.x} ${a.y + 12}C${a.x} ${(a.y + b.y) / 2 + 45} ${b.x} ${(a.y + b.y) / 2 + 45} ${b.x} ${b.y + 12}`;
            return (
              <g
                key={`${link.from}-${link.to}`}
                className={`world-link ${link.kind} ${active ? "link-active" : ""} ${denied ? "link-denied" : ""}`}
              >
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
              strokeWidth={s.secondaryActive ? 2.5 : 1}
              strokeOpacity={s.secondaryActive ? 0.8 : 0.25}
              strokeDasharray="6 8"
              className={s.secondaryActive ? "standby-flow" : ""}
            />
          )}
        </g>
        {worldNodes
          .filter((n) => n.id !== "dr" || recovery)
          .map((n) => {
            const current = selected === n.id || focus === n.id,
              faded = layer !== "all" && n.layer !== layer;
            const failed = componentUnavailable(n, props.scenario, s);
            const blocked =
              n.id === "networkpolicy" && props.scenario === "policy-block";
            return (
              <g
                key={n.id}
                transform={`translate(${n.x} ${n.y})`}
                {...selectable(n.id, conceptById[n.id].title, onSelect)}
                className={`scene-object ${current ? "object-active" : ""} ${faded ? "object-faded" : ""} ${failed ? "object-failed" : ""}`}
                style={{ "--object-color": getColor(n.layer) } as CSSProperties}
              >
                <title>
                  {conceptById[n.id].title}: {conceptById[n.id].summary}
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
                <Artifact shape={n.shape} layer={n.layer} />
                <text y="46" textAnchor="middle" className="object-title">
                  {n.label}
                </text>
                <text y="66" textAnchor="middle" className="object-subtitle">
                  {n.sub}
                </text>
                {failed && (
                  <text y="-110" textAnchor="middle" className="failure-label">
                    UNAVAILABLE
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
          const failed = regionLost || s.failedZone === zone;
          const count = zoneReadyCounts(s)[zone];
          return (
            <g
              key={zone}
              transform={`translate(${x} 835)`}
              className={`worker-island ${failed ? "zone-failed" : ""} ${layer !== "all" && layer !== "workload" ? "object-faded" : ""}`}
            >
              <Platform
                x={0}
                y={12}
                w={129}
                d={68}
                color={failed ? "#e48198" : "#81accf"}
              />
              <g
                transform="translate(-56 -10)"
                className="scene-object"
                {...selectable(
                  "nodes",
                  `worker node in zone ${zone + 1}`,
                  onSelect,
                )}
              >
                <Artifact shape="tower" layer="workload" />
                <text x="-12" y="39" className="worker-label">
                  NODE {zone + 1}
                </text>
              </g>
              {[0, 1, 2, 3].map((slot) => {
                const visible = slot < Math.max(count, 2),
                  ready = slot < count;
                if (!visible) return null;
                const px = slot % 2 === 0 ? 28 : 71,
                  py = slot < 2 ? -15 : 22;
                return (
                  <g
                    key={slot}
                    transform={`translate(${px} ${py}) scale(.44)`}
                    className={`scene-object pod-artifact ${ready ? "pod-ready" : "pod-unready"} ${selected === "pods" || focus === "pods" ? "object-active" : ""}`}
                    {...selectable(
                      "pods",
                      `application Pod, ${ready ? "ready" : "unavailable"}`,
                      onSelect,
                    )}
                  >
                    <Artifact
                      shape="cube"
                      layer={
                        s.phase === "Old and new versions overlap" && slot === 0
                          ? "operations"
                          : "workload"
                      }
                    />
                    <circle
                      cy="-64"
                      r="5"
                      fill={ready ? "#b1f5d7" : "#f17a97"}
                      filter="url(#bloom)"
                    />
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
                <text y="102" textAnchor="middle" className="zone-label">
                  ZONE {String.fromCharCode(65 + zone)}{" "}
                  <tspan fill={failed ? "#ef829c" : "#86c8ae"}>
                    {" "}
                    / {failed ? "OFFLINE" : `${count} READY`}
                  </tspan>
                </text>
              </g>
            </g>
          );
        })}
        {s.nodes === 4 && (
          <g className="extra-capacity" transform="translate(1520 925)">
            <path d="M-40 0 0-20 40 0 0 20Z" fill="#142f32" stroke="#8bdbac" />
            <text y="46" textAnchor="middle" className="recovery-label">
              +1 NODE / NEW CAPACITY
            </text>
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
