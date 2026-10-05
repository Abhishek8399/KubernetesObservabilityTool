"use client";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent, WheelEvent } from "react";
import {
  concepts,
  conceptById,
  layers,
  getColor,
  mapNodes,
  mapLinks,
} from "./data/concepts";
import type { Layer, MapNode, ComponentKind } from "./data/concepts";
import { journeys, migrationSteps } from "./data/journeys";
import { examples } from "./data/examples";
import { readyBackends, simulate, scenarios } from "./lib/simulation";
import type { Scenario, Simulation } from "./lib/simulation";
import { Icon } from "./icons";

type View = "architecture" | "library" | "migration";
type DetailTab = "explain" | "configure" | "debug";
const kindLabels: Record<ComponentKind, string> = {
  Core: "Native Kubernetes",
  Extension: "Optional / implementation",
  Pattern: "Architecture pattern",
  External: "Outside Kubernetes",
};
const iconFor = (layer: Layer) => layers.find((l) => l.id === layer)!.icon;
const nodeById = Object.fromEntries(mapNodes.map((n) => [n.id, n])) as Record<
  string,
  MapNode
>;
const mapTitles: Record<string, string> = {
  hpa: "Horizontal autoscaler",
  service: "Service + endpoints",
  deployment: "Deployment",
  gateway: "Gateway + data plane",
  configmap: "ConfigMap",
  secrets: "Secrets",
  rbac: "API access / RBAC",
  networkpolicy: "NetworkPolicy",
  observability: "Observability",
  pvc: "Persistent storage",
  database: "External data services",
  loadbalancer: "External load balancer",
  backup: "Backup + restore",
  dr: "Regional recovery",
};
const alias: Record<string, string> = {
  pods: "deployment",
  kubelet: "deployment",
  nodes: "deployment",
  autoscaler: "hpa",
  probes: "service",
  affinity: "deployment",
};
function svgPath(a: MapNode, b: MapNode) {
  if (Math.abs(a.x - b.x) < 20) {
    const x = a.x + a.w / 2;
    return `M ${x} ${a.y + a.h} C ${x} ${a.y + a.h + 28}, ${x} ${b.y - 28}, ${x} ${b.y}`;
  }
  if (a.y === b.y) {
    const forward = a.x < b.x;
    return `M ${forward ? a.x + a.w : a.x} ${a.y + a.h / 2} L ${forward ? b.x : b.x + b.w} ${b.y + b.h / 2}`;
  }
  if (a.id === "loadbalancer")
    return `M ${a.x + a.w / 2} ${a.y + a.h} L ${a.x + a.w / 2} 180 L 318 180 L 318 476 L ${b.x} 476`;
  if (a.id === "gitops")
    return `M ${a.x + a.w} ${a.y + a.h / 2} L 286 ${a.y + a.h / 2} L 286 319 L ${b.x} 319`;
  if (a.id === "git" && b.id === "gitops")
    return `M 40 336 L 24 336 L 24 680 L 40 680`;
  if (a.id === "api" && b.id === "deployment")
    return `M 580 345 L 595 345 L 595 553 L 460 553 L 460 568`;
  if (a.id === "api" && (b.id === "scheduler" || b.id === "controllers"))
    return `M 460 277 L 460 256 L ${b.x + b.w / 2} 256 L ${b.x + b.w / 2} 277`;
  return `M ${a.x + a.w / 2} ${a.y + a.h} C ${a.x + a.w / 2} ${a.y + a.h + 45}, ${b.x + b.w / 2} ${b.y - 45}, ${b.x + b.w / 2} ${b.y}`;
}
function MapCard({
  node,
  selected,
  dimmed,
  focus,
  onSelect,
  alert,
}: {
  node: MapNode;
  selected: boolean;
  dimmed: boolean;
  focus: boolean;
  onSelect: (id: string) => void;
  alert?: boolean;
}) {
  const c = conceptById[node.id],
    color = getColor(c.layer);
  return (
    <g
      className={`map-card ${selected ? "selected" : ""} ${dimmed ? "dimmed" : ""} ${focus ? "flow-focus" : ""} ${alert ? "alert-card" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`Explore ${c.title}`}
      onClick={() => onSelect(c.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(c.id);
        }
      }}
      style={{ "--node-color": color } as React.CSSProperties}
    >
      <title>
        {c.title}: {c.summary}
      </title>
      <rect
        x={node.x}
        y={node.y}
        width={node.w}
        height={node.h}
        rx="12"
        className="node-bg"
      />
      <rect
        x={node.x + 14}
        y={node.y + 15}
        width="33"
        height="33"
        rx="9"
        fill={color}
        fillOpacity="0.10"
      />
      <Icon
        name={iconFor(c.layer)}
        size={21}
        x={node.x + 20}
        y={node.y + 21}
        color={color}
      />
      <text x={node.x + 58} y={node.y + 30} className="node-title">
        {mapTitles[c.id] ?? c.title}
      </text>
      <text x={node.x + 58} y={node.y + 47} className="node-kind" fill={color}>
        {c.kind === "Core" ? "NATIVE" : c.kind.toUpperCase()}
      </text>
      <text x={node.x + 15} y={node.y + node.h - 15} className="node-subtitle">
        {node.subtitle}
      </text>
      <circle
        cx={node.x + node.w - 14}
        cy={node.y + 14}
        r="3"
        fill={alert ? "#fc8b9e" : color}
        fillOpacity={selected ? 1 : 0.6}
      />
    </g>
  );
}
function Worker({
  index,
  sim,
  scenario,
  elapsed,
  onSelect,
  selected,
}: {
  index: number;
  sim: Simulation;
  scenario: Scenario;
  elapsed: number;
  onSelect: (id: string) => void;
  selected: string;
}) {
  const x = 340 + index * 350,
    y = 697,
    w = 310,
    failed = sim.nodes === 0 || sim.failedZone === index;
  const slots =
    sim.failedZone !== null
      ? index === sim.failedZone
        ? 0
        : sim.ready === 6
          ? 3
          : 2
      : scenario === "traffic-spike" && sim.ready >= 9
        ? 3
        : 2;
  return (
    <g className={`worker-card ${failed ? "worker-failed" : ""}`}>
      <rect
        x={x}
        y={y}
        width={w}
        height="160"
        rx="13"
        fill="#121f32"
        stroke={failed ? "#bd5e73" : "#304563"}
      />
      <rect
        x={x}
        y={y}
        width={w}
        height="38"
        rx="13"
        fill={failed ? "#492333" : "#1a2b40"}
      />
      <text x={x + 15} y={y + 24} className="node-title">
        ZONE {String.fromCharCode(65 + index)}{" "}
        <tspan className="node-kind" dx="10">
          {failed ? "UNAVAILABLE" : "WORKER NODE"}
        </tspan>
      </text>
      <circle
        cx={x + w - 19}
        cy={y + 20}
        r="4"
        fill={failed ? "#fb7e99" : "#67dfd0"}
      />
      <g
        role="button"
        tabIndex={0}
        aria-label={`Explore worker node in zone ${String.fromCharCode(65 + index)}`}
        onClick={() => onSelect("nodes")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect("nodes");
          }
        }}
      >
        <Icon name="cpu" x={x + 17} y={y + 50} size={18} color="#94a6c4" />
        <text x={x + 45} y={y + 64} className="worker-meta">
          kubelet Â· runtime Â· CNI
        </text>
      </g>
      {Array.from({ length: 3 }, (_, p) => {
        const lost =
            failed ||
            (scenario === "pod-failure" &&
              sim.failedPod &&
              index === 0 &&
              p === 0),
          active = p < slots && !lost,
          updating = scenario === "rollout" && elapsed < 9 && p === 1;
        return (
          <g
            key={p}
            className={`pod ${active ? "pod-ready" : "pod-empty"} ${lost ? "pod-lost" : ""} ${selected === "pods" ? "pod-highlight" : ""}`}
            role="button"
            tabIndex={0}
            aria-label={`Explore ${active ? "ready" : "unavailable"} Pod in zone ${String.fromCharCode(65 + index)}`}
            onClick={() => onSelect("pods")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect("pods");
              }
            }}
          >
            <rect
              x={x + 17 + p * 94}
              y={y + 80}
              width="82"
              height="57"
              rx="9"
            />
            <Icon
              name="cube"
              x={x + 26 + p * 94}
              y={y + 92}
              size={20}
              color={active ? (updating ? "#f2bd82" : "#89b4ff") : "#52617b"}
            />
            <text x={x + 51 + p * 94} y={y + 106} className="pod-label">
              {lost ? "lost" : active ? (updating ? "v2" : "Pod") : "slot"}
            </text>
            <circle
              cx={x + 81 + p * 94}
              cy={y + 91}
              r="3"
              fill={active ? "#67dfd0" : "#52617b"}
            />
          </g>
        );
      })}
      <text x={x + 17} y={y + 153} className="node-kind">
        {failed
          ? "Replacements need surviving capacity"
          : scenario === "traffic-spike"
            ? "Illustrative slots: 3 per node"
            : "Application replicas Â· illustrative placement"}
      </text>
    </g>
  );
}
function ArchitectureMap({
  selected,
  layer,
  playing,
  flowNode,
  onSelect,
  sim,
  scenario,
  elapsed,
  dr,
  zoom,
  setZoom,
}: {
  selected: string;
  layer: Layer | "all";
  playing: boolean;
  flowNode: string | null;
  onSelect: (id: string) => void;
  sim: Simulation;
  scenario: Scenario;
  elapsed: number;
  dr: boolean;
  zoom: number;
  setZoom: (n: number) => void;
}) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
  const svgRef = useRef<SVGSVGElement>(null);
  const width = dr ? 1860 : 1440,
    height = 1165,
    vw = width / zoom,
    vh = height / zoom;
  const originX = (width - vw) / 2 - pan.x,
    originY = (height - vh) / 2 - pan.y;
  const focused = flowNode ? (alias[flowNode] ?? flowNode) : null;
  function pointerDown(e: PointerEvent<SVGSVGElement>) {
    if ((e.target as Element).closest('[role="button"]')) return;
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function pointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!drag.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPan({
      x: Math.max(
        -width,
        Math.min(
          width,
          drag.current.px + ((e.clientX - drag.current.x) * vw) / rect.width,
        ),
      ),
      y: Math.max(
        -height,
        Math.min(
          height,
          drag.current.py + ((e.clientY - drag.current.y) * vh) / rect.height,
        ),
      ),
    });
  }
  function wheel(e: WheelEvent<SVGSVGElement>) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(Math.max(0.8, Math.min(3, zoom + (e.deltaY > 0 ? -0.1 : 0.1))));
    }
  }
  return (
    <div className={`map-surface ${playing ? "is-playing" : ""}`}>
      <div className="map-corner">
        <span className="map-coordinate">REFERENCE TOPOLOGY / 01</span>
        <span>Logical relationships, not a universal packet trace</span>
      </div>
      <svg
        ref={svgRef}
        className="architecture-svg"
        viewBox={`${originX} ${originY} ${vw} ${vh}`}
        role="group"
        aria-label="Interactive Kubernetes architecture. Select components for explanations."
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onWheel={wheel}
      >
        <defs>
          <pattern
            id="grid"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="0.9" fill="#41506b" opacity=".5" />
          </pattern>
          <linearGradient id="cluster-fill" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#13253b" />
            <stop offset="1" stopColor="#0f182a" />
          </linearGradient>
          <linearGradient id="control-fill">
            <stop stopColor="#302544" stopOpacity=".55" />
            <stop offset="1" stopColor="#241f39" stopOpacity=".3" />
          </linearGradient>
          <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <marker
            id="arrow-traffic"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 8 4 L 0 8 Z" fill="#67dfd0" />
          </marker>
          <marker
            id="arrow-control"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 8 4 L 0 8 Z" fill="#a998eb" />
          </marker>
          <marker
            id="arrow-dependency"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 8 4 L 0 8 Z" fill="#c7ae8b" />
          </marker>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />
        <text x="35" y="31" className="group-title" fill="#78c9ff">
          01 â€” THE OUTSIDE WORLD
        </text>
        <rect
          x="20"
          y="240"
          width="245"
          height="505"
          rx="18"
          className="group-box delivery-box"
        />
        <text x="40" y="272" className="group-title" fill="#f2bd82">
          02 â€” RELEASE DELIVERY
        </text>
        <rect
          x="305"
          y="219"
          width="1090"
          height="760"
          rx="22"
          fill="url(#cluster-fill)"
          stroke={sim.nodes === 0 ? "#ad5770" : "#365674"}
          strokeWidth="1.5"
        />
        <text x="330" y="247" className="cluster-label">
          âŽˆ PRIMARY CLUSTER
        </text>
        <text
          x="1367"
          y="247"
          textAnchor="end"
          className="node-kind"
          fill={sim.nodes === 0 ? "#fc8b9e" : "#67dfd0"}
        >
          {sim.nodes === 0 ? "UNAVAILABLE" : "INDEPENDENT CONTROL PLANE"}
        </text>
        <rect
          x="327"
          y="265"
          width="1043"
          height="109"
          rx="14"
          fill="url(#control-fill)"
          stroke="#47385e"
        />
        <text x="340" y="398" className="group-title" fill="#b8a3ff">
          03 â€” CONTROL PLANE
        </text>
        <text x="1350" y="398" textAnchor="end" className="node-kind">
          STATE + RECONCILIATION Â· NOT APPLICATION TRAFFIC
        </text>
        <text x="340" y="425" className="group-title" fill="#67dfd0">
          04 â€” NETWORK & SERVICE DISCOVERY
        </text>
        <text x="340" y="556" className="group-title" fill="#89b4ff">
          05 â€” WORKLOAD CONTROL & ELASTICITY
        </text>
        <text x="340" y="682" className="group-title" fill="#89b4ff">
          06 â€” DATA PLANE / WORKER CAPACITY
        </text>
        {mapLinks.map((l, i) => {
          const a = nodeById[l.from],
            b = nodeById[l.to],
            d = svgPath(a, b),
            active = focused === l.from || focused === l.to;
          return (
            <g
              key={`${l.from}-${l.to}`}
              className={`connection ${l.kind} ${active ? "active-connection" : ""}`}
            >
              <path
                d={d}
                markerEnd={`url(#arrow-${l.kind})`}
                className="connection-line"
              />
              <path
                d={d}
                className="connection-motion"
                style={{ animationDelay: `${-i * 0.33}s` }}
              />
            </g>
          );
        })}
        <path
          d="M 717 518 L 717 533 L 1368 533 L 1368 868 L 1005 868"
          className="connection-line traffic packet-rail"
        />
        <path
          d="M 500 868 L 1005 868"
          className="connection-line traffic packet-rail"
        />
        <path
          d="M 500 857 L 500 868 M 850 857 L 850 868 M 1200 857 L 1200 868"
          className="connection-line traffic"
        />
        <text x="755" y="863" className="edge-caption">
          Service forwarding â†’ ready Pod endpoints
        </text>
        <path
          d="M 580 815 L 286 815 L 286 1081 L 300 1081"
          className={`connection-line dependency ${scenario === "dependency-outage" ? "blocked-flow" : ""}`}
        />
        <path
          d="M 1250 815 L 1410 815 L 1410 1022 L 695 1022 L 695 1040"
          className="connection-line dependency"
        />
        <text x="50" y="799" className="edge-caption">
          Images pulled by runtime
        </text>
        <path
          d="M 245 565 L 280 565 L 280 775 L 340 775"
          className="connection-line dependency"
        />
        {mapNodes.map((n) => (
          <MapCard
            key={n.id}
            node={n}
            selected={selected === n.id}
            focus={focused === n.id}
            dimmed={layer !== "all" && conceptById[n.id].layer !== layer}
            onSelect={onSelect}
            alert={
              (scenario === "dependency-outage" && n.id === "database") ||
              (scenario === "policy-block" && n.id === "networkpolicy") ||
              (scenario === "region-failure" && n.id === "api")
            }
          />
        ))}
        {[0, 1, 2].map((i) => (
          <Worker
            key={i}
            index={i}
            sim={sim}
            selected={selected}
            scenario={scenario}
            elapsed={elapsed}
            onSelect={onSelect}
          />
        ))}
        {sim.nodes === 4 && (
          <g>
            <rect
              x="1120"
              y="657"
              width="230"
              height="27"
              rx="8"
              fill="#1c3a31"
              stroke="#46866c"
            />
            <text
              x="1235"
              y="675"
              textAnchor="middle"
              className="worker-meta"
              fill="#8bdbac"
            >
              + NODE D Â· 3 READY REPLICAS
            </text>
          </g>
        )}
        <text x="35" y="1024" className="group-title" fill="#e7c98d">
          07 â€” DATA, TELEMETRY & RECOVERY
        </text>
        {dr && (
          <g
            className={`secondary-region ${sim.secondaryActive ? "standby-active" : ""}`}
          >
            <rect
              x="1440"
              y="219"
              width="390"
              height="760"
              rx="22"
              fill="#111e30"
              stroke={sim.secondaryActive ? "#67dfd0" : "#466489"}
              strokeDasharray={sim.secondaryActive ? "0" : "7 6"}
            />
            <text x="1465" y="252" className="cluster-label">
              âŽˆ SECONDARY CLUSTER
            </text>
            <text x="1465" y="278" className="node-kind" fill="#78c9ff">
              OPTIONAL Â· INDEPENDENT REGION
            </text>
            <rect
              x="1470"
              y="310"
              width="330"
              height="100"
              rx="13"
              fill="#25233b"
              stroke="#494162"
            />
            <Icon name="cpu" size={30} x="1490" y="329" color="#b8a3ff" />
            <text x="1540" y="345" className="node-title">
              Independent control plane
            </text>
            <text x="1490" y="387" className="worker-meta">
              Separate API server Â· etcd Â· controllers
            </text>
            <rect
              x="1470"
              y="451"
              width="330"
              height="176"
              rx="13"
              fill="#142a35"
              stroke="#2f5967"
            />
            <Icon name="network" size={30} x="1490" y="475" color="#67dfd0" />
            <text x="1540" y="495" className="node-title">
              Standby workload capacity
            </text>
            <text x="1490" y="532" className="worker-meta">
              Own gateway Â· Services Â· ready Pods
            </text>
            <text x="1490" y="560" className="worker-meta">
              Traffic policy and health checks required
            </text>
            <text
              x="1490"
              y="590"
              className="worker-meta"
              fill={sim.secondaryActive ? "#67dfd0" : "#94a6c4"}
            >
              {sim.secondaryActive
                ? "PROMOTED Â· SERVING TRAFFIC"
                : "ILLUSTRATIVE WARM STANDBY"}
            </text>
            <rect
              x="1470"
              y="673"
              width="330"
              height="166"
              rx="13"
              fill="#302936"
              stroke="#65515c"
            />
            <Icon name="database" size={30} x="1490" y="695" color="#e7c98d" />
            <text x="1540" y="713" className="node-title">
              Application data recovery
            </text>
            <text x="1490" y="750" className="worker-meta">
              Replication or restore outside Kubernetes
            </text>
            <text x="1490" y="778" className="worker-meta">
              Consistency Â· fencing Â· tested RTO/RPO
            </text>
            <text x="1490" y="805" className="worker-meta">
              Cluster state is not cross-region replicated
            </text>
            <path
              d="M 1207 147 L 1207 180 L 1635 180 L 1635 451"
              className={`connection-line traffic ${sim.secondaryActive ? "active-connection" : ""}`}
            />
            <text x="1635" y="910" textAnchor="middle" className="worker-meta">
              Multi-cluster management is optional tooling.
            </text>
            <text x="1635" y="936" textAnchor="middle" className="worker-meta">
              No automatic federation or regional failover.
            </text>
          </g>
        )}
      </svg>
      <div className="map-bottom">
        <div className="map-legend">
          <span>
            <i className="legend-line traffic" /> Logical traffic
          </span>
          <span>
            <i className="legend-line control" /> API / reconcile
          </span>
          <span>
            <i className="legend-line dependency" /> Dependency
          </span>
        </div>
        <button
          className="plain-button reset-pan"
          onClick={() => {
            setPan({ x: 0, y: 0 });
            setZoom(1);
          }}
        >
          Reset view
        </button>
      </div>
      <span className="pan-hint">
        Drag to pan Â· Ctrl / âŒ˜ + scroll to zoom Â· Tab to explore
      </span>
    </div>
  );
}

function Inspector({
  id,
  tab,
  setTab,
  onSelect,
  onBookmark,
  bookmarked,
}: {
  id: string;
  tab: DetailTab;
  setTab: (t: DetailTab) => void;
  onSelect: (id: string) => void;
  onBookmark: () => void;
  bookmarked: boolean;
}) {
  const c = conceptById[id] ?? conceptById.api,
    color = getColor(c.layer);
  const [copied, setCopied] = useState(false);
  const copyText = examples[c.id] ?? c.command;
  async function copy() {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }
  return (
    <aside className="inspector" aria-label="Component inspector">
      <div className="inspector-top">
        <p className="eyebrow">COMPONENT INSPECTOR</p>
        <button
          className={`icon-button ${bookmarked ? "bookmarked" : ""}`}
          title={bookmarked ? "Remove saved concept" : "Save concept"}
          aria-label={bookmarked ? "Remove saved concept" : "Save concept"}
          onClick={onBookmark}
        >
          <Icon name="star" size={16} />
        </button>
      </div>
      <div
        className="inspector-symbol"
        style={{ color, borderColor: color + "55", background: color + "12" }}
      >
        <Icon name={iconFor(c.layer)} size={31} />
      </div>
      <span className="kind-badge" style={{ color }}>
        {kindLabels[c.kind]}
      </span>
      <h2>{c.title}</h2>
      <p className="component-summary">{c.summary}</p>
      <div
        className="inspector-tabs"
        role="tablist"
        aria-label="Component details"
      >
        {(["explain", "configure", "debug"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t === "explain"
              ? "Understand"
              : t === "configure"
                ? "Configure"
                : "Diagnose"}
          </button>
        ))}
      </div>
      <div className="inspector-content" role="tabpanel">
        {tab === "explain" && (
          <>
            <div className="detail-block">
              <h3>How it works</h3>
              <p>{c.how}</p>
            </div>
            <div className="gotcha">
              <span>
                <Icon name="shield" size={15} /> Engineering note
              </span>
              <p>{c.pitfall}</p>
            </div>
            <div className="detail-block">
              <h3>Continue the connection</h3>
              <div className="related-list">
                {concepts
                  .filter((a) => a.layer === c.layer && a.id !== c.id)
                  .slice(0, 5)
                  .map((a) => (
                    <button key={a.id} onClick={() => onSelect(a.id)}>
                      {a.title}
                      <Icon name="chevron" size={13} />
                    </button>
                  ))}
              </div>
            </div>
          </>
        )}
        {tab === "configure" && (
          <>
            <p className="example-note">
              {examples[c.id]
                ? "Illustrative manifest. Replace placeholders and validate against your cluster."
                : "Start with this read-only inspection. Replace angle-bracket placeholders."}
            </p>
            <div className="code-header">
              <span>
                {examples[c.id] ? "YAML / EXAMPLE" : "KUBECTL / INSPECT"}
              </span>
              <button
                className="icon-button"
                aria-label="Copy example"
                onClick={copy}
              >
                <Icon name={copied ? "check" : "copy"} size={14} />
              </button>
            </div>
            <pre className="code-block">
              <code>{copyText}</code>
            </pre>
            <div className="gotcha">
              <span>Before applying</span>
              <p>
                Review scope and implementation support. Use server-side dry-run
                and a diff in a staging environment. These examples are not
                deployed resources.
              </p>
            </div>
          </>
        )}
        {tab === "debug" && (
          <>
            <div className="detail-block">
              <h3>Inspect the first useful evidence</h3>
              <p>
                {c.command.includes("<")
                  ? "Substitute the actual resource name and namespace."
                  : "Run this against the intended cluster context."}
              </p>
              <pre className="code-block">
                <code>{c.command}</code>
              </pre>
            </div>
            <div className="gotcha">
              <span>Common failure boundary</span>
              <p>{c.pitfall}</p>
            </div>
            <div className="detail-block">
              <h3>Trace the dependency</h3>
              <p>{c.how}</p>
              <p className="example-note">
                Some commands require optional APIs, a metrics pipeline, or
                cluster-level access. Check RBAC before interpreting an empty or
                denied result.
              </p>
            </div>
          </>
        )}
        <a
          className="source-link"
          href={c.source}
          target="_blank"
          rel="noreferrer"
        >
          Read the Kubernetes documentation
          <Icon name="arrow" size={15} />
        </a>
      </div>
    </aside>
  );
}

export default function Explorer() {
  const [view, setView] = useState<View>("architecture"),
    [selected, setSelected] = useState("api"),
    [layer, setLayer] = useState<Layer | "all">("all"),
    [tab, setTab] = useState<DetailTab>("explain");
  const [playing, setPlaying] = useState(true),
    [tick, setTick] = useState(0),
    [scenario, setScenario] = useState<Scenario>("healthy"),
    [dr, setDr] = useState(false),
    [zoom, setZoom] = useState(1),
    [presentation, setPresentation] = useState(false);
  const [search, setSearch] = useState(""),
    [kind, setKind] = useState("all"),
    [savedOnly, setSavedOnly] = useState(false),
    [bookmarks, setBookmarks] = useState<string[]>([]),
    [activeJourney, setActiveJourney] = useState<string | null>(null),
    [journeyStep, setJourneyStep] = useState(0),
    [showAbout, setShowAbout] = useState(false);
  const [migrationDone, setMigrationDone] = useState<number[]>([]);
  const [hint, setHint] = useState("");
  const journey = journeys.find((j) => j.id === activeJourney),
    step = journey?.steps[journeyStep];
  const currentId = step?.node ?? selected,
    sim = simulate(scenario, tick, dr);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [playing]);
  useEffect(() => {
    if (!playing || !journey) return;
    const timer = setInterval(
      () => setJourneyStep((s) => (s + 1) % journey.steps.length),
      6500,
    );
    return () => clearInterval(timer);
  }, [playing, journey]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPresentation(false);
        setShowAbout(false);
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  const filtered = concepts.filter(
    (c) =>
      (layer === "all" || c.layer === layer) &&
      (kind === "all" || c.kind === kind) &&
      (!savedOnly || bookmarks.includes(c.id)) &&
      `${c.title} ${c.summary} ${c.how}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  function select(id: string) {
    setSelected(id);
    setActiveJourney(null);
    setTab("explain");
  }
  function startJourney(id: string) {
    setActiveJourney(id);
    setJourneyStep(0);
    setView("architecture");
    setLayer("all");
    setPlaying(true);
    setTab("explain");
    setZoom(1);
  }
  function chooseScenario(id: Scenario) {
    setScenario(id);
    setTick(0);
    setActiveJourney(null);
    setPlaying(true);
    if (id === "region-failure") {
      setSelected("dr");
    } else if (id === "traffic-spike") {
      setSelected("hpa");
    } else if (id === "policy-block") {
      setSelected("networkpolicy");
    } else if (id === "dependency-outage") {
      setSelected("database");
    } else if (id === "healthy") {
      setSelected("api");
    } else {
      setSelected("pods");
    }
  }
  function bookmark() {
    const next = bookmarks.includes(currentId)
      ? bookmarks.filter((id) => id !== currentId)
      : [...bookmarks, currentId];
    setBookmarks(next);
    try {
      localStorage.setItem(
        "kubernetes-observatory-saved",
        JSON.stringify(next),
      );
      setHint("Saved on this device");
    } catch {
      setHint("Saved for this session");
    }
    setTimeout(() => setHint(""), 2000);
  }
  function restoreSaved() {
    try {
      const raw = JSON.parse(
        localStorage.getItem("kubernetes-observatory-saved") ?? "[]",
      );
      if (Array.isArray(raw))
        setBookmarks(
          raw
            .filter(
              (x): x is string => typeof x === "string" && !!conceptById[x],
            )
            .slice(0, concepts.length),
        );
    } catch {
      setBookmarks([]);
    }
    setSavedOnly(true);
    setView("library");
  }
  return (
    <main className="observatory">
      <a className="skip-link" href="#main-content">
        Skip to architecture
      </a>
      <header className="topbar">
        <button
          className="brand brand-button"
          onClick={() => setView("architecture")}
          aria-label="Kubernetes Observatory home"
        >
          <span className="brand-symbol">âŽˆ</span>
          <span>
            KUBERNETES<span className="brand-sub">OBSERVATORY</span>
          </span>
        </button>
        <nav className="top-nav" aria-label="Main navigation">
          <button
            className={view === "architecture" ? "active" : ""}
            onClick={() => setView("architecture")}
          >
            The architecture
          </button>
          <button
            className={view === "library" ? "active" : ""}
            onClick={() => {
              setView("library");
              setSavedOnly(false);
            }}
          >
            Concept library <span>{concepts.length}</span>
          </button>
          <button
            className={view === "migration" ? "active" : ""}
            onClick={() => setView("migration")}
          >
            Build your platform
          </button>
        </nav>
        <button className="status-pill" onClick={() => setShowAbout(true)}>
          <i /> A living reference <span>â†—</span>
        </button>
      </header>
      <section className="intro">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-line" /> ARCHITECTURE, NOT JUST ARROWS.
          </p>
          <h1>
            The whole system.
            <br />
            <span>Finally, connected.</span>
          </h1>
          <p className="intro-copy">
            Step inside Kubernetes. Follow the traffic, meet the control loops,
            <br className="desktop-break" /> and watch a resilient platform
            respond to change.
          </p>
          <div className="intro-actions">
            <button
              className="primary-button"
              onClick={() => startJourney("request")}
            >
              <Icon name="play" size={15} /> Follow a request{" "}
              <Icon name="arrow" size={16} />
            </button>
            <button
              className="text-button"
              onClick={() => {
                setView("library");
                setSavedOnly(false);
              }}
            >
              Explore {concepts.length} concepts{" "}
              <Icon name="chevron" size={15} />
            </button>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <div className="hero-core">âŽˆ</div>
          <div className="orbit-dot d1" />
          <div className="orbit-dot d2" />
          <div className="orbit-dot d3" />
          <span className="hero-caption">DESIRED STATE â†’ LIVING SYSTEM</span>
        </div>
      </section>
      <div className="section-line">
        <div>
          <span className="section-number">01</span>
          <span>
            {view === "library"
              ? "THE CONCEPT LIBRARY"
              : view === "migration"
                ? "FROM APPLICATION TO PLATFORM"
                : "INTERACTIVE SYSTEM MAP"}
          </span>
        </div>
        <div className="section-note">
          <span>{concepts.length} concepts</span>
          <span>8 layers</span>
          <span>Vendor-neutral</span>
        </div>
      </div>
      <section
        id="main-content"
        className={`workspace ${presentation ? "presentation-mode" : ""} ${view !== "architecture" ? "reading-mode" : ""}`}
      >
        <aside className="rail">
          <p className="eyebrow">EXPLORE THE LAYERS</p>
          {layers.map((l) => (
            <button
              className={layer === l.id ? "layer-active" : ""}
              key={l.id}
              onClick={() => setLayer(l.id)}
              style={{ "--layer-color": l.color } as React.CSSProperties}
            >
              <Icon name={l.icon} size={17} />
              <span>{l.label}</span>
              <span className="layer-count">
                {l.id === "all"
                  ? concepts.length
                  : concepts.filter((c) => c.layer === l.id).length}
              </span>
            </button>
          ))}
          <div className="rail-bottom">
            <p className="eyebrow">TAKE A CLOSER LOOK</p>
            <button className="saved-button" onClick={restoreSaved}>
              <Icon name="star" size={16} />
              <span>Saved concepts</span>
              <span className="layer-count">{bookmarks.length}</span>
            </button>
            <div className="reference-note">
              <Icon name="book" size={18} />
              <p>
                A reference architecture.
                <br />
                Adapt it to your requirements.
              </p>
            </div>
          </div>
        </aside>
        <div className="map-column">
          {view === "architecture" ? (
            <>
              <div className="map-toolbar">
                <div className="toolbar-title">
                  <i className="live-dot" />
                  <span>
                    {sim.secondaryActive
                      ? "Standby serving"
                      : sim.nodes === 0
                        ? "Primary unavailable"
                        : "Primary cluster"}
                  </span>
                  <span className="toolbar-badge">SIMULATION</span>
                </div>
                <div className="toolbar-controls">
                  <button
                    className={`icon-button ${!playing ? "is-paused" : ""}`}
                    onClick={() => setPlaying((p) => !p)}
                    aria-label={playing ? "Pause animation" : "Play animation"}
                    title={playing ? "Pause animation" : "Play animation"}
                  >
                    <Icon name={playing ? "pause" : "play"} size={16} />
                  </button>
                  <div className="zoom-control">
                    <button
                      onClick={() => setZoom((z) => Math.max(0.8, z - 0.2))}
                      aria-label="Zoom out"
                    >
                      âˆ’
                    </button>
                    <span>{Math.round(zoom * 100)}%</span>
                    <button
                      onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                      aria-label="Zoom in"
                    >
                      +
                    </button>
                  </div>
                  <button
                    className="icon-button"
                    onClick={() => setPresentation((p) => !p)}
                    aria-label={
                      presentation ? "Exit presentation" : "Enter presentation"
                    }
                    title="Presentation mode"
                  >
                    <Icon name={presentation ? "close" : "expand"} size={16} />
                  </button>
                </div>
              </div>
              <div className="simulation-bar">
                <div className="scenario-picker">
                  <label htmlFor="scenario">SIMULATE</label>
                  <select
                    id="scenario"
                    value={scenario}
                    onChange={(e) => chooseScenario(e.target.value as Scenario)}
                  >
                    {scenarios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="dr-switch">
                  <input
                    type="checkbox"
                    checked={dr}
                    onChange={(e) => {
                      setDr(e.target.checked);
                      setTick(0);
                    }}
                  />
                  <span className="switch-track" />
                  <span>Multi-region</span>
                </label>
                <button
                  className="icon-button"
                  onClick={() => setTick(0)}
                  aria-label="Restart simulation"
                >
                  <Icon name="reset" size={15} />
                </button>
              </div>
              <ArchitectureMap
                selected={currentId}
                layer={layer}
                playing={playing}
                flowNode={step?.node ?? null}
                onSelect={select}
                sim={sim}
                scenario={scenario}
                elapsed={tick}
                dr={dr}
                zoom={zoom}
                setZoom={setZoom}
              />
              <div className="simulation-footer" aria-live="polite">
                <div className="metric">
                  <span>READY / DESIRED</span>
                  <strong>
                    {sim.ready}
                    <small> / {sim.desired}</small>
                  </strong>
                </div>
                <div className="metric">
                  <span>WORKER NODES</span>
                  <strong>
                    {sim.nodes}
                    <small>{sim.nodes === 4 ? " + capacity" : ""}</small>
                  </strong>
                </div>
                <div className="metric">
                  <span>TRAFFIC BACKENDS</span>
                  <strong
                    className={
                      readyBackends(sim) > 0 ? "metric-green" : "metric-red"
                    }
                  >
                    {readyBackends(sim)}
                    <small>{sim.secondaryActive ? " standby" : ""}</small>
                  </strong>
                </div>
                <div className="phase">
                  <span
                    className={`phase-dot ${!sim.serviceAvailable ? "error" : ""}`}
                  />
                  <div>
                    <span>ILLUSTRATIVE STATE</span>
                    <strong>{sim.phase}</strong>
                  </div>
                </div>
              </div>
              {scenario !== "healthy" && (
                <div className="event-log">
                  <span className="eyebrow">WHAT IS HAPPENING</span>
                  {sim.events.map((e, i) => (
                    <p key={e}>
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      {e}
                    </p>
                  ))}
                  <small>
                    Timing and metrics are illustrative. Real behavior depends
                    on configuration, capacity, controllers, and dependencies.
                  </small>
                </div>
              )}
            </>
          ) : view === "library" ? (
            <>
              <div className="library-header">
                <p className="eyebrow">A FIELD GUIDE TO THE ENTIRE PLATFORM</p>
                <h2>Every component has a purpose.</h2>
                <p>
                  Understand the behavior, the boundaries, and the tradeoffs.
                </p>
                <div className="search-box">
                  <Icon name="search" size={18} />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search concepts, behavior, or a failureâ€¦"
                    aria-label="Search concepts"
                  />
                  <kbd>/</kbd>
                </div>
                <div className="library-filters">
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                    aria-label="Filter concept type"
                  >
                    <option value="all">All component types</option>
                    {Object.entries(kindLabels).map(([k, v]) => (
                      <option value={k} key={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <button
                    className={savedOnly ? "active" : ""}
                    onClick={() => setSavedOnly((s) => !s)}
                  >
                    <Icon name="star" size={13} /> Saved only
                  </button>
                  <span>{filtered.length} results</span>
                </div>
              </div>
              <div className="concept-grid">
                {filtered.length === 0 ? (
                  <div className="empty-state">
                    <Icon name="search" size={30} />
                    <h3>No matching concepts</h3>
                    <p>Try another search, layer, or component type.</p>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setSearch("");
                        setLayer("all");
                        setKind("all");
                        setSavedOnly(false);
                      }}
                    >
                      Reset filters
                    </button>
                  </div>
                ) : (
                  filtered.map((c) => (
                    <button
                      className={`concept-card ${currentId === c.id ? "concept-selected" : ""}`}
                      key={c.id}
                      onClick={() => select(c.id)}
                      style={
                        {
                          "--node-color": getColor(c.layer),
                        } as React.CSSProperties
                      }
                    >
                      <div className="concept-card-top">
                        <Icon name={iconFor(c.layer)} size={23} />
                        <span>{c.kind}</span>
                      </div>
                      <h3>{c.title}</h3>
                      <p>{c.summary}</p>
                      <span className="concept-open">
                        Explore concept <Icon name="arrow" size={14} />
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className="library-header">
                <p className="eyebrow">THINK LIKE A PLATFORM ENGINEER</p>
                <h2>Build in dependency order.</h2>
                <p>
                  A vendor-neutral path from container workloads to an operable
                  Kubernetes platform. Each stage requires evidence before the
                  next.
                </p>
                <div className="migration-progress">
                  <div
                    style={{
                      width: `${(migrationDone.length / migrationSteps.length) * 100}%`,
                    }}
                  />
                </div>
                <span className="progress-caption">
                  {migrationDone.length} of {migrationSteps.length} stages
                  reviewed Â· session checklist
                </span>
              </div>
              <div className="migration-list">
                {migrationSteps.map(([title, body, tags], i) => (
                  <article
                    className={
                      migrationDone.includes(i) ? "stage-complete" : ""
                    }
                    key={title}
                  >
                    <button
                      className="stage-check"
                      aria-label={`Mark ${title} ${migrationDone.includes(i) ? "incomplete" : "reviewed"}`}
                      aria-pressed={migrationDone.includes(i)}
                      onClick={() =>
                        setMigrationDone((s) =>
                          s.includes(i) ? s.filter((v) => v !== i) : [...s, i],
                        )
                      }
                    >
                      {migrationDone.includes(i) ? (
                        <Icon name="check" size={17} />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </button>
                    <div>
                      <h3>{title}</h3>
                      <p>{body}</p>
                      <span>{tags}</span>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
        <Inspector
          id={currentId}
          tab={tab}
          setTab={setTab}
          onSelect={select}
          onBookmark={bookmark}
          bookmarked={bookmarks.includes(currentId)}
        />
      </section>
      {view === "architecture" && (
        <section className="journeys-section">
          <div className="journeys-title">
            <div>
              <p className="eyebrow">LEARN THROUGH MOTION</p>
              <h2>Four journeys. One connected system.</h2>
            </div>
            <span>Choose a path through the architecture.</span>
          </div>
          <div className="journey-cards">
            {journeys.map((j) => (
              <button
                key={j.id}
                className={`journey-card ${activeJourney === j.id ? "journey-active" : ""}`}
                onClick={() => startJourney(j.id)}
              >
                <span>{j.label}</span>
                <h3>
                  {j.title}
                  <Icon name="arrow" size={18} />
                </h3>
                <p>{j.description}</p>
                <small>
                  {j.steps.length} connected steps <span>â†—</span>
                </small>
              </button>
            ))}
          </div>
          {journey && step && (
            <div className="journey-player">
              <div className="journey-player-head">
                <span className="eyebrow">{journey.title.toUpperCase()}</span>
                <div>
                  <button
                    className="icon-button"
                    onClick={() => setPlaying((p) => !p)}
                    aria-label={playing ? "Pause journey" : "Play journey"}
                  >
                    <Icon name={playing ? "pause" : "play"} size={15} />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => setActiveJourney(null)}
                    aria-label="Close journey"
                  >
                    <Icon name="close" size={15} />
                  </button>
                </div>
              </div>
              <div className="journey-progress">
                {journey.steps.map((s, i) => (
                  <button
                    key={s.title}
                    className={
                      i === journeyStep
                        ? "current"
                        : i < journeyStep
                          ? "complete"
                          : ""
                    }
                    onClick={() => setJourneyStep(i)}
                    aria-label={`Step ${i + 1}: ${s.title}`}
                    aria-current={i === journeyStep ? "step" : undefined}
                  >
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <small>{conceptById[s.node].title}</small>
                  </button>
                ))}
              </div>
              <div className="journey-description">
                <strong>{step.title}</strong>
                <p>{step.body}</p>
                <button
                  className="text-button"
                  onClick={() =>
                    setJourneyStep((s) => (s + 1) % journey.steps.length)
                  }
                >
                  Next step <Icon name="arrow" size={15} />
                </button>
              </div>
            </div>
          )}
        </section>
      )}
      <section className="architecture-notes">
        <div>
          <Icon name="layers" size={22} />
          <strong>Core â‰  ecosystem</strong>
          <p>
            Native APIs, optional tools, external services, and architecture
            patterns are labeled separately.
          </p>
        </div>
        <div>
          <Icon name="network" size={22} />
          <strong>Connections have meaning</strong>
          <p>
            Traffic, API reconciliation, and dependencies are distinct. Not
            every arrow is a packet hop.
          </p>
        </div>
        <div>
          <Icon name="shield" size={22} />
          <strong>Resilience is designed</strong>
          <p>
            Multi-region recovery, backups, application consistency, and
            measured RTO/RPO require explicit work.
          </p>
        </div>
      </section>
      <footer>
        <span>âŽˆ Kubernetes Observatory</span>
        <p>
          Independent educational project. Vendor-neutral. Simulations are not a
          running Kubernetes cluster.
        </p>
        <button className="text-button" onClick={() => setShowAbout(true)}>
          About this reference <Icon name="arrow" size={13} />
        </button>
      </footer>
      {hint && (
        <div className="toast" role="status">
          <Icon name="check" size={16} />
          {hint}
        </div>
      )}
      {showAbout && (
        <div className="modal-backdrop" onClick={() => setShowAbout(false)}>
          <section
            className="about-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              onClick={() => setShowAbout(false)}
              aria-label="Close about dialog"
              autoFocus
            >
              <Icon name="close" />
            </button>
            <span className="brand-symbol">âŽˆ</span>
            <p className="eyebrow">A SYSTEM YOU CAN EXPLORE</p>
            <h2 id="about-title">Architecture in motion.</h2>
            <p>
              Kubernetes Observatory is an independent, vendor-neutral learning
              tool. It connects {concepts.length} concepts through a reference
              architecture, guided journeys, and deliberately simplified
              simulations.
            </p>
            <p>
              It is not a production blueprint for every company. Select
              components based on workload requirements, trust boundaries,
              reliability objectives, and operational capacity. Optional tools
              and multi-region patterns are explicitly labeled.
            </p>
            <p>
              No production systems are connected. Saved concepts stay in your
              browser; there is no app account or telemetry. Web fonts are
              loaded from Google Fonts, and source links open official
              documentation.
            </p>
            <div className="about-links">
              <a
                href="https://kubernetes.io/docs/"
                target="_blank"
                rel="noreferrer"
              >
                Kubernetes documentation â†—
              </a>
              <a
                href="https://github.com/Abhishek8399/KubernetesObservabilityTool"
                target="_blank"
                rel="noreferrer"
              >
                Source repository â†—
              </a>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
