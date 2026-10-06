"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import ArchitectureScene, {
  Artifact,
  SceneDefinitions,
  type Camera,
} from "./architecture-scene";
import {
  concepts,
  conceptById,
  getColor,
  layers,
  type Layer,
} from "./data/concepts";
import { journeys, migrationSteps } from "./data/journeys";
import { worldNodes, type WorldLink } from "./data/world";
import { explainConnection } from "./data/connections";
import { Inspector } from "./explorer";
import { Icon } from "./icons";
import {
  bookmarkSnapshot,
  parseBookmarks,
  saveBookmarks,
  subscribeBookmarks,
} from "./lib/bookmarks";
import { readyBackends, scenarios, type Scenario } from "./lib/simulation";
import LabConsole from "./lab-console";
import { labFrame, advanceLab, boundedLabTime, labDuration } from "./lib/lab";
import { Soundscape } from "./lib/sound";
import "./universe.css";
import "./lessons.css";

type Modal =
  | "connection"
  | "component"
  | "library"
  | "scenarios"
  | "migration"
  | "about"
  | null;
const allowedIds = new Set(concepts.map((c) => c.id));
const home: Camera = { x: 0, y: 0, zoom: 1 };
const kinds = {
  Core: "Native Kubernetes",
  Extension: "Optional implementation",
  Pattern: "Architecture pattern",
  External: "External system",
};
function motionSnapshot() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
function subscribeMotion(listener: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

export default function Universe() {
  const [modal, setModal] = useState<Modal>(null),
    [selected, setSelected] = useState<string | null>(null),
    [tab, setTab] = useState<"explain" | "configure" | "debug">("explain");
  const [layer, setLayer] = useState<Layer | "all">("all"),
    [camera, setCamera] = useState<Camera>(home),
    [scenario, setScenario] = useState<Scenario>("healthy"),
    [elapsed, setElapsed] = useState(0),
    [recovery, setRecovery] = useState(false),
    [paused, setPaused] = useState(false),
    [speed, setSpeed] = useState(1),
    [resolved, setResolved] = useState(false);
  const [journeyId, setJourneyId] = useState<string | null>(null),
    [step, setStep] = useState(0),
    [autoTour, setAutoTour] = useState(false),
    [search, setSearch] = useState(""),
    [libraryLayer, setLibraryLayer] = useState<Layer | "all">("all"),
    [savedOnly, setSavedOnly] = useState(false);
  const [connection, setConnection] = useState<WorldLink | null>(null);
  const [sound, setSound] = useState(false),
    [audioBusy, setAudioBusy] = useState(false),
    [message, setMessage] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    audio = useRef<Soundscape | null>(null),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    searchInput = useRef<HTMLInputElement>(null);
  const stored = useSyncExternalStore(
    subscribeBookmarks,
    bookmarkSnapshot,
    () => "[]",
  );
  const saved = useMemo(() => parseBookmarks(stored, allowedIds), [stored]);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    motionSnapshot,
    () => true,
  );
  const playbackDone = elapsed >= labDuration;
  const frame = labFrame(scenario, elapsed, recovery, resolved),
    sim = frame.simulation,
    backends = readyBackends(sim);
  const journey = journeys.find((j) => j.id === journeyId),
    journeyStep = journey?.steps[step];
  const component = selected ? conceptById[selected] : null;
  const visibleConcepts = concepts.filter(
    (c) =>
      (libraryLayer === "all" || libraryLayer === c.layer) &&
      (!savedOnly || saved.includes(c.id)) &&
      `${c.title} ${c.summary} ${c.layer}`
        .toLowerCase()
        .includes(search.toLowerCase().trim()),
  );

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (modal && !el.open) el.showModal();
    if (!modal && el.open) el.close();
    if (modal === "library") searchInput.current?.focus();
    else if (modal)
      el.querySelector<HTMLButtonElement>("[data-dialog-close]")?.focus();
  }, [modal]);
  useEffect(() => {
    if (paused || modal || scenario === "healthy" || playbackDone) return;
    const timer = setInterval(
      () => setElapsed((t) => advanceLab(t, 0.25 * speed)),
      250,
    );
    return () => clearInterval(timer);
  }, [paused, scenario, modal, speed, playbackDone]);
  useEffect(() => {
    if (
      !journey ||
      !autoTour ||
      paused ||
      modal ||
      step === journey.steps.length - 1
    )
      return;
    const timer = setTimeout(() => setStep((s) => s + 1), 7000);
    return () => clearTimeout(timer);
  }, [journey, autoTour, paused, modal, step]);
  useEffect(() => {
    if (scenario !== "healthy" && frame.index >= 2) audio.current?.play("step");
  }, [scenario, frame.index]);
  useEffect(() => {
    if (journeyStep) audio.current?.play("step");
  }, [journeyStep]);
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        e.key === "/" &&
        !modal &&
        !target.closest("input,textarea,[contenteditable]")
      ) {
        e.preventDefault();
        setModal("library");
      }
      if (e.key === "Escape" && !modal) {
        setJourneyId(null);
        setAutoTour(false);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [modal]);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      audio.current?.close().catch((error: unknown) => {
        console.warn(
          "Audio device cleanup failed.",
          error instanceof Error ? error.name : "UnknownError",
        );
      });
    },
    [],
  );

  function notify(text: string) {
    setMessage(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMessage(""), 4500);
  }
  function select(id: string) {
    if (!conceptById[id]) return;
    setSelected(id);
    setTab("explain");
    setModal("component");
    audio.current?.play("select");
  }
  function bookmark(id: string) {
    const values = saved.includes(id)
      ? saved.filter((v) => v !== id)
      : [...saved, id];
    if (!saveBookmarks(values))
      notify("Saved for this session. Browser storage is unavailable.");
  }
  async function toggleSound() {
    setAudioBusy(true);
    try {
      audio.current ??= new Soundscape();
      if (sound) {
        await audio.current.disable();
        setSound(false);
      } else {
        await audio.current.enable();
        setSound(true);
      }
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Audio could not start. Try enabling it again.",
      );
    } finally {
      setAudioBusy(false);
    }
  }
  function changeScenario(id: Scenario) {
    setScenario(id);
    setElapsed(4);
    setResolved(false);
    setPaused(false);
    setLayer("all");
    setCamera(home);
    setSelected(null);
    setJourneyId(null);
    setModal(null);
    audio.current?.play(id === "healthy" ? "select" : "failure");
  }
  function beginJourney(id: string) {
    setScenario("healthy");
    setElapsed(0);
    setResolved(false);
    setJourneyId(id);
    setStep(0);
    setAutoTour(false);
    setLayer("all");
    setCamera(home);
    audio.current?.play("select");
  }
  function resetWorld() {
    setScenario("healthy");
    setElapsed(0);
    setResolved(false);
    setRecovery(false);
    setPaused(false);
    setJourneyId(null);
    setAutoTour(false);
    setCamera(home);
    setLayer("all");
    setSelected(null);
    audio.current?.play("select");
  }
  const artifact = worldNodes.find((n) => n.id === selected);

  return (
    <main
      className={`universe ${scenario !== "healthy" ? "has-lab" : ""} ${journey ? "has-journey" : ""} ${paused || reducedMotion ? "motion-off" : ""}`}
    >
      <div className="world-vignette" />
      <ArchitectureScene
        scenario={scenario}
        simulation={sim}
        lab={frame}
        highlights={
          scenario !== "healthy"
            ? frame.chapter.focus
            : journeyStep
              ? [journeyStep.node]
              : []
        }
        selected={selected}
        focus={journeyStep?.node ?? null}
        layer={layer}
        motion={!paused && !reducedMotion && !modal}
        recovery={recovery}
        camera={camera}
        onCamera={setCamera}
        onSelect={select}
        onConnection={(link) => {
          setConnection(link);
          setModal("connection");
          audio.current?.play("select");
        }}
      />
      <header className="world-header">
        <button
          className="world-brand"
          onClick={resetWorld}
          aria-label="Kubernetes Observatory: reset the architecture"
        >
          <span className="brand-mark">
            <Icon name="orbit" size={30} />
          </span>
          <span>
            KUBERNETES<small>THE LIVING ARCHITECTURE</small>
          </span>
        </button>
        <span className="field-label">
          <i /> INTERACTIVE FIELD GUIDE / 001
        </span>
        <div className="header-actions">
          <button
            className="world-button library-button"
            onClick={() => setModal("library")}
          >
            <Icon name="search" size={15} />
            <span>Explore {concepts.length} concepts</span>
            <kbd>/</kbd>
          </button>
          <button
            className={`world-icon ${sound ? "sound-enabled" : ""}`}
            onClick={toggleSound}
            disabled={audioBusy}
            aria-label={sound ? "Mute sound" : "Enable sound"}
            aria-pressed={sound}
            title={
              sound
                ? "Sound on · click to mute"
                : "Enable gentle interaction sounds"
            }
          >
            <Icon name={sound ? "volume" : "mute"} size={19} />
          </button>
        </div>
      </header>
      <div className="world-intro">
        <span className="world-eyebrow">
          <span /> A LIVING SYSTEM, EXPLAINED
        </span>
        <h1>
          Understand the
          <br />
          <em>whole system.</em>
        </h1>
        <p>
          Follow a request. Watch controllers respond.
          <br />
          See what changes when something fails.
        </p>
        <button onClick={() => beginJourney("request")} className="intro-link">
          <span className="tiny-play">
            <Icon name="play" size={12} />
          </span>
          Follow your first request
          <Icon name="arrow" size={15} />
        </button>
        <div className="intro-meta">
          VENDOR NEUTRAL <span> / </span> OPEN TO EVERYONE
        </div>
      </div>
      {scenario !== "healthy" && (
        <LabConsole
          frame={frame}
          scenario={scenario}
          paused={paused}
          speed={speed}
          recovery={recovery}
          onSeek={(time) => {
            setElapsed(boundedLabTime(time));
            setPaused(true);
            setResolved(false);
          }}
          onReplay={() => {
            setElapsed(4);
            setResolved(false);
            setPaused(false);
            audio.current?.play("failure");
          }}
          onPause={() => setPaused((v) => !v)}
          onSpeed={(value) => {
            if ([0.5, 1, 2].includes(value)) setSpeed(value);
          }}
          onRepair={() => {
            setResolved(true);
            setElapsed(22);
            setPaused(false);
            audio.current?.play("step");
          }}
          onRecovery={(enabled) => {
            setRecovery(enabled);
            setElapsed(4);
            setPaused(false);
          }}
          onClose={resetWorld}
          onInspect={select}
          onChoose={() => setModal("scenarios")}
        />
      )}
      <nav
        className="overview-lessons"
        aria-label="Understand the architecture"
      >
        <button onClick={() => beginJourney("request")}>
          <Icon name="network" size={18} />
          <span>
            <strong>How does a request reach a Pod?</strong>
            <small>Gateway ? Service ? a ready application replica</small>
          </span>
        </button>
        <button onClick={() => beginJourney("deploy")}>
          <Icon name="cpu" size={18} />
          <span>
            <strong>Who decides what should run?</strong>
            <small>API state ? controllers ? scheduling ? kubelet</small>
          </span>
        </button>
        <button onClick={() => changeScenario("pod-failure")}>
          <Icon name="pulse" size={18} />
          <span>
            <strong>What changes when a Pod fails?</strong>
            <small>Run the failure lesson and watch every stage</small>
          </span>
        </button>
      </nav>
      <nav className="world-layers" aria-label="Highlight architecture layers">
        <span className="hud-label">LENSES</span>
        {layers.map((l) => (
          <button
            key={l.id}
            onClick={() => setLayer(l.id)}
            className={layer === l.id ? "active" : ""}
            aria-pressed={layer === l.id}
            title={l.label}
            style={{ "--lens-color": l.color } as CSSProperties}
          >
            <Icon name={l.icon} size={16} />
            <span>
              {l.id === "all" ? "Everything" : l.label.split(" & ")[0]}
            </span>
          </button>
        ))}
      </nav>
      <aside
        className={`world-status ${backends === 0 ? "status-failure" : ""}`}
        aria-label="Simulation status"
      >
        <div className="status-heading">
          <span className="status-light" />
          <span>
            {scenario === "healthy"
              ? "SYSTEM IN BALANCE"
              : sim.phase.toUpperCase()}
          </span>
          <span className="sim-badge">SIMULATED</span>
        </div>
        <div className="status-numbers">
          <span>
            <strong>
              {sim.ready}
              <small>/{sim.desired}</small>
            </strong>
            PRIMARY READY
          </span>
          <span>
            <strong>{sim.nodes}</strong>PRIMARY NODES
          </span>
          <span>
            <strong>{backends > 0 ? "OK" : "FAIL"}</strong>REQUEST PATH
          </span>
        </div>
        {sim.pending > 0 && (
          <p className="pending-note">
            {sim.pending} replicas waiting for capacity
          </p>
        )}
        <button
          className="status-experiment"
          aria-label="Open failure laboratory"
          title="Open failure laboratory"
          onClick={() => setModal("scenarios")}
        >
          <Icon name="pulse" size={14} />
          {scenario === "healthy"
            ? "Introduce a failure"
            : `Scenario · ${elapsed}s`}
          <Icon name="chevron" size={13} />
        </button>
      </aside>
      <div className="camera-tools" aria-label="Camera and playback controls">
        <button
          onClick={() =>
            setCamera({ ...camera, zoom: Math.min(2, camera.zoom + 0.15) })
          }
          aria-label="Zoom in"
        >
          +
        </button>
        <span>{Math.round(camera.zoom * 100)}%</span>
        <button
          onClick={() =>
            setCamera({ ...camera, zoom: Math.max(0.65, camera.zoom - 0.15) })
          }
          aria-label="Zoom out"
        >
          −
        </button>
        <span className="tool-divider" />
        <button
          onClick={() => setCamera(home)}
          aria-label="Reset camera"
          title="Reset camera"
        >
          <Icon name="expand" size={16} />
        </button>
        <button
          onClick={() => setPaused((v) => !v)}
          aria-label={
            paused
              ? "Resume simulation and motion"
              : "Pause simulation and motion"
          }
          aria-pressed={paused}
          title={paused ? "Resume" : "Pause"}
        >
          <Icon name={paused ? "play" : "pause"} size={15} />
        </button>
      </div>
      {journey && journeyStep && (
        <section
          className="journey-console"
          aria-label="Guided architecture journey"
        >
          <div className="journey-progress">
            {journey.steps.map((s, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={i === step ? "active" : i < step ? "complete" : ""}
                aria-label={`Step ${i + 1}: ${s.title}`}
                aria-current={i === step ? "step" : undefined}
              />
            ))}
          </div>
          <div className="journey-topline">
            <span>
              {journey.label}{" "}
              <b>
                {String(step + 1).padStart(2, "0")} /{" "}
                {String(journey.steps.length).padStart(2, "0")}
              </b>
            </span>
            <button
              onClick={() => {
                setJourneyId(null);
                setAutoTour(false);
              }}
              aria-label="Close journey"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
          <h2>{journeyStep.title}</h2>
          <p>{journeyStep.body}</p>
          <div className="journey-controls">
            <button onClick={() => select(journeyStep.node)}>
              <Icon name="layers" size={14} />
              Open component
            </button>
            <div>
              <button
                disabled={step === 0}
                onClick={() => setStep((s) => s - 1)}
                aria-label="Previous journey step"
              >
                ←
              </button>
              <button
                aria-label={
                  autoTour ? "Stop automatic tour" : "Start automatic tour"
                }
                aria-pressed={autoTour}
                onClick={() => {
                  if (step === journey.steps.length - 1) setStep(0);
                  setAutoTour((v) => !v);
                }}
              >
                <Icon
                  name={
                    autoTour && step < journey.steps.length - 1
                      ? "pause"
                      : "play"
                  }
                  size={14}
                />
              </button>
              <button
                disabled={step === journey.steps.length - 1}
                onClick={() => setStep((s) => s + 1)}
                aria-label="Next journey step"
              >
                →
              </button>
            </div>
          </div>
        </section>
      )}
      <div className="world-dock">
        <span className="dock-label">TRACE THE SYSTEM</span>
        <div className="dock-journeys">
          {journeys.map((j, i) => (
            <button
              key={j.id}
              className={journeyId === j.id ? "active" : ""}
              onClick={() => beginJourney(j.id)}
            >
              <span>0{i + 1}</span>
              {["Request", "Release", "Scale", "Recover"][i]}
              <Icon name="arrow" size={13} />
            </button>
          ))}
        </div>
        <span className="dock-divider" />
        <button className="dock-build" onClick={() => setModal("migration")}>
          <Icon name="terminal" size={17} />
          <span>Build the platform</span>
        </button>
      </div>
      <footer className="world-bottom">
        <button onClick={() => setModal("about")}>
          <i /> EDUCATIONAL SIMULATION <Icon name="chevron" size={10} />
        </button>
        <span>
          DRAG TO EXPLORE <b>·</b> CLICK COMPONENTS OR CONNECTIONS <b>·</b>{" "}
          SOUND {sound ? "ON" : "OFF"}
        </span>
        <button onClick={() => setModal("library")} className="footer-saved">
          <Icon name="star" size={11} /> {saved.length} SAVED
        </button>
      </footer>
      <div className="world-toast" role="status">
        {message}
      </div>
      <dialog
        ref={dialog}
        className={`world-dialog dialog-${modal ?? "closed"}`}
        onClose={() => setModal(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
        aria-labelledby="modal-title"
      >
        <div className="dialog-chrome">
          <span id="modal-title">
            {modal === "connection"
              ? "EXPLAIN THE CONNECTION"
              : modal === "component"
                ? "COMPONENT FIELD NOTES"
                : modal === "library"
                  ? "THE ARCHITECTURE LIBRARY"
                  : modal === "scenarios"
                    ? "FAILURE LABORATORY"
                    : modal === "migration"
                      ? "FROM WORKLOAD TO PLATFORM"
                      : "ABOUT THIS WORLD"}
          </span>
          <button
            className="world-icon"
            onClick={() => dialog.current?.close()}
            aria-label="Close popup"
            data-dialog-close
            autoFocus={modal !== "library"}
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        {modal === "connection" && connection && (
          <div className="connection-popup">
            <span className="world-eyebrow">
              {explainConnection(connection).kind}
            </span>
            <h2>{explainConnection(connection).title}</h2>
            <div className="connection-endpoints">
              <button onClick={() => select(connection.from)}>
                {conceptById[connection.from].title}
                <small>Explore this component</small>
              </button>
              <Icon name="arrow" size={25} />
              <button onClick={() => select(connection.to)}>
                {conceptById[connection.to].title}
                <small>Explore this component</small>
              </button>
            </div>
            <p>{explainConnection(connection).body}</p>
            <div className="connection-note">
              <strong>How to read this line</strong>
              <p>{explainConnection(connection).note}</p>
            </div>
          </div>
        )}
        {modal === "component" && component && (
          <div
            className="component-popup"
            style={
              {
                "--component-color": getColor(component.layer),
              } as CSSProperties
            }
          >
            <div className="component-stage">
              <div className="component-orbit">
                <svg viewBox="-180 -230 360 400" aria-hidden="true">
                  <SceneDefinitions namespace="detail-" />
                  <ellipse
                    rx="140"
                    ry="50"
                    cy="40"
                    fill="none"
                    stroke={getColor(component.layer)}
                    strokeOpacity=".3"
                    strokeDasharray="2 9"
                  />
                  <Artifact
                    shape={
                      artifact?.shape ??
                      (component.layer === "storage" ? "database" : "cube")
                    }
                    layer={component.layer}
                    large
                    namespace="detail-"
                  />
                </svg>
              </div>
              <span className="component-index">
                {component.layer.toUpperCase()} /{" "}
                {String(
                  concepts.findIndex((c) => c.id === component.id) + 1,
                ).padStart(2, "0")}
              </span>
              <h2>{component.title}</h2>
              <span className="component-kind">{kinds[component.kind]}</span>
              <p>
                Understand the role.
                <br />
                Inspect the configuration.
                <br />
                Find the failure boundary.
              </p>
              <span className="component-stage-note">
                VENDOR-NEUTRAL FIELD NOTES
              </span>
            </div>
            <Inspector
              key={selected}
              id={component.id}
              tab={tab}
              setTab={setTab}
              onSelect={select}
              onBookmark={() => bookmark(component.id)}
              bookmarked={saved.includes(component.id)}
            />
          </div>
        )}
        {modal === "library" && (
          <div className="library-popup">
            <div className="modal-intro">
              <span className="world-eyebrow">EXPLORE THE COMPLETE SYSTEM</span>
              <h2>
                One architecture.
                <br />
                <em>{concepts.length} connections to understand.</em>
              </h2>
              <p>
                Native building blocks, optional extensions, and the engineering
                decisions between them.
              </p>
            </div>
            <div className="library-search">
              <Icon name="search" size={19} />
              <input
                ref={searchInput}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find a component, concept, or responsibility…"
                aria-label="Search Kubernetes concepts"
              />
              <button
                onClick={() => setSavedOnly((v) => !v)}
                className={savedOnly ? "active" : ""}
                aria-pressed={savedOnly}
              >
                <Icon name="star" size={15} />
                <span>Saved</span>
              </button>
            </div>
            <div className="library-filters">
              {layers.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLibraryLayer(l.id)}
                  className={libraryLayer === l.id ? "active" : ""}
                  aria-pressed={libraryLayer === l.id}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <div className="library-results-label">
              {visibleConcepts.length} FIELD NOTES
            </div>
            <div className="concept-grid">
              {visibleConcepts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => select(c.id)}
                  style={
                    { "--concept-color": getColor(c.layer) } as CSSProperties
                  }
                >
                  <span className="concept-tile-top">
                    <Icon
                      name={layers.find((l) => l.id === c.layer)!.icon}
                      size={23}
                    />
                    <small>{kinds[c.kind]}</small>
                  </span>
                  <h3>{c.title}</h3>
                  <p>{c.summary}</p>
                  <span className="concept-tile-bottom">
                    EXPLORE{" "}
                    <Icon
                      name={saved.includes(c.id) ? "star" : "arrow"}
                      size={14}
                    />
                  </span>
                </button>
              ))}
            </div>
            {visibleConcepts.length === 0 && (
              <p className="empty-library">
                No matching concepts. Try a broader search or turn off the Saved
                filter.
              </p>
            )}
          </div>
        )}
        {modal === "scenarios" && (
          <div className="scenario-popup">
            <div className="modal-intro">
              <span className="world-eyebrow">
                LEARN AT THE FAILURE BOUNDARY
              </span>
              <h2>
                Break something.
                <br />
                <em>Watch the system respond.</em>
              </h2>
              <p>
                Illustrative timings and assumed capacity. Real recovery depends
                on your controllers, probes, infrastructure, and application.
              </p>
            </div>
            <label className="standby-toggle">
              <span>
                <Icon name="globe" size={21} />
                <strong>Design a regional standby</strong>
                <small>
                  Separate cluster, routing, capacity and data recovery
                </small>
              </span>
              <input
                type="checkbox"
                checked={recovery}
                onChange={(e) => {
                  setRecovery(e.target.checked);
                  setElapsed(0);
                }}
              />
              <span className="toggle-track" />
            </label>
            <div className="scenario-grid">
              {scenarios.map((s, i) => (
                <button
                  key={s.id}
                  className={scenario === s.id ? "active" : ""}
                  onClick={() => changeScenario(s.id)}
                >
                  <span className="scenario-index">
                    0{i + 1}
                    <Icon
                      name={s.id === "healthy" ? "check" : "pulse"}
                      size={19}
                    />
                  </span>
                  <h3>{s.title}</h3>
                  <p>{s.detail}</p>
                  <span className="scenario-run">
                    {scenario === s.id ? "RESTART SCENARIO" : "RUN EXPERIMENT"}
                    <Icon name="arrow" size={15} />
                  </span>
                </button>
              ))}
            </div>
            <div className="simulation-events">
              <h3>Current simulation evidence</h3>
              {sim.events.map((event) => (
                <p key={event}>
                  <span />
                  {event}
                </p>
              ))}
            </div>
          </div>
        )}
        {modal === "migration" && (
          <div className="build-popup">
            <div className="modal-intro">
              <span className="world-eyebrow">
                THINK LIKE A PLATFORM ENGINEER
              </span>
              <h2>
                Start with requirements.
                <br />
                <em>Build the right system.</em>
              </h2>
              <p>
                A provider-neutral path from an existing container workload to a
                Kubernetes platform. Use a development cluster first and
                validate each boundary.
              </p>
            </div>
            <div className="build-timeline">
              {migrationSteps.map(([title, body, tags], i) => (
                <article key={title}>
                  <span className="build-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                    <span className="build-tags">{tags}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
        {modal === "about" && (
          <div className="about-popup">
            <Icon name="orbit" size={52} />
            <span className="world-eyebrow">KUBERNETES OBSERVATORY</span>
            <h2>A map of the machinery.</h2>
            <p>
              This interactive field guide makes a complex system explorable.
              The scene groups responsibilities logically; it is not a network
              topology or a live cluster dashboard.
            </p>
            <div className="connection-key">
              <span>
                <i className="key-traffic" />
                Request data path
              </span>
              <span>
                <i className="key-control" />
                Control / reconciliation
              </span>
              <span>
                <i className="key-dependency" />
                Dependency / metadata
              </span>
            </div>
            <p>
              Requests do not flow through the API server, scheduler, or etcd.
              The gateway graphic represents an implemented data plane. DNS
              resolution and endpoint metadata are dependencies, not
              packet-processing hops.
            </p>
            <p>
              GitOps, service meshes, storage drivers, autoscaling integrations,
              external load balancing and regional recovery depend on separately
              chosen implementations. No single company needs every component.
            </p>
            <p>
              Failure timings are accelerated simulations. Ready Pods are
              different from successful requests. A designed standby is required
              for regional recovery; Kubernetes does not create one
              automatically.
            </p>
            <p>
              Sounds are generated locally after you enable them. Saved concepts
              stay in your browser. This app has no cluster credentials,
              deployment actions, or live infrastructure connection.
            </p>
            <button
              className="world-button"
              onClick={() => setModal("library")}
            >
              <Icon name="book" size={16} />
              Open the field notes
              <Icon name="arrow" size={16} />
            </button>
          </div>
        )}
      </dialog>
    </main>
  );
}
