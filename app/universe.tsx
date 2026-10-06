"use client";

import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { Artifact, SceneDefinitions, type Camera } from "./architecture-scene";
import SpatialScene from "./spatial-scene";
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
import "./flight.css";
import "./spatial.css";
import "./experience.css";
import FlightDeck from "./flight-deck";
import { flightMission, resourceAnchor } from "./lib/flight";
import { useSimulationBackend } from "./use-simulation-backend";
import {
  applicationFrame,
  parseUnderstanding,
  saveUnderstanding,
  subscribeUnderstanding,
  understandingSnapshot,
} from "./lib/learning";
import { useFlightCamera } from "./use-flight-camera";
import type { SpatialView } from "./lib/spatial";

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
  const [autopilot, setAutopilot] = useState(true),
    [flightEpoch, setFlightEpoch] = useState(0),
    [incidentControls, setIncidentControls] = useState(false);
  const [connection, setConnection] = useState<WorldLink | null>(null);
  const [diagramOnly, setDiagramOnly] = useState(false);
  const [sceneEpoch, setSceneEpoch] = useState(0);
  const spatialView = useRef<SpatialView | null>(null);
  const recordSpatialView = useCallback((view: SpatialView) => {
    spatialView.current = view;
  }, []);
  const getSpatialView = useCallback(() => spatialView.current, []);
  const [sound, setSound] = useState(true),
    [volume, setVolume] = useState(0.45),
    [audioBusy, setAudioBusy] = useState(false),
    [message, setMessage] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    audio = useRef<Soundscape | null>(null),
    audioReady = useRef(false),
    volumeRef = useRef(volume),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    searchInput = useRef<HTMLInputElement>(null);
  const stored = useSyncExternalStore(
    subscribeBookmarks,
    bookmarkSnapshot,
    () => "[]",
  );
  const progressRaw = useSyncExternalStore(
    subscribeUnderstanding,
    understandingSnapshot,
    () => "{}",
  );
  const progress = useMemo(
    () => parseUnderstanding(progressRaw),
    [progressRaw],
  );
  const saved = useMemo(() => parseBookmarks(stored, allowedIds), [stored]);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    motionSnapshot,
    () => true,
  );
  const journey = useMemo(
    () => flightMission(journeyId, recovery, resolved),
    [journeyId, recovery, resolved],
  );
  const journeyStep = journey?.steps[step];
  const flightTime = journeyStep?.time ?? elapsed;
  const playbackDone = flightTime >= labDuration;
  const backend = useSimulationBackend(
    journeyId,
    step,
    recovery,
    resolved,
    paused,
  );
  const frame =
      backend.frame ??
      (journeyId === "application"
        ? applicationFrame(step)
        : labFrame(scenario, flightTime, recovery, resolved)),
    sim = frame.simulation,
    backends = readyBackends(sim);
  const destination = journeyStep
    ? (journeyStep.anchor ?? resourceAnchor(journeyStep.node))
    : undefined;
  const stopKey = `${journeyId}:${step}:${flightEpoch}`;
  const flightVisual = useFlightCamera({
    destination,
    stopKey,
    enabled: !!journey && autopilot,
    paused: paused || !!modal,
    reducedMotion,
    camera,
    onCamera: setCamera,
    getSpatialView,
  });
  const flightArrived = flightVisual?.progress === 1 && !flightVisual.previous;
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
    if (paused || modal || journeyId || scenario === "healthy" || playbackDone)
      return;
    const timer = setInterval(
      () => setElapsed((t) => advanceLab(t, 0.25 * speed)),
      250,
    );
    return () => clearInterval(timer);
  }, [paused, scenario, modal, speed, playbackDone, journeyId]);
  useEffect(() => {
    if (
      !journey ||
      !autoTour ||
      !autopilot ||
      !flightArrived ||
      paused ||
      modal ||
      step === journey.steps.length - 1
    )
      return;
    const timer = setTimeout(() => setStep((s) => s + 1), 11000 / speed);
    return () => clearTimeout(timer);
  }, [journey, autoTour, autopilot, flightArrived, paused, modal, step, speed]);
  useEffect(() => {
    if (scenario !== "healthy" && frame.index >= 2) audio.current?.play("step");
  }, [scenario, frame.index]);
  useEffect(() => {
    if (journeyStep) audio.current?.play("flight");
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
        setElapsed(flightTime);
        setPaused(scenario !== "healthy");
        setJourneyId(null);
        setAutoTour(false);
        setCamera(home);
        setSceneEpoch((value) => value + 1);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [modal, flightTime, scenario]);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      const device = audio.current;
      audio.current = null;
      audioReady.current = false;
      device?.close().catch((error: unknown) => {
        console.warn(
          "Audio device cleanup failed.",
          error instanceof Error ? error.name : "UnknownError",
        );
      });
    },
    [],
  );

  useEffect(() => {
    volumeRef.current = volume;
    audio.current?.setVolume(volume);
  }, [volume]);
  useEffect(() => {
    if (!sound || audioReady.current) return;
    let active = true;
    const start = (event: Event) => {
      if ((event.target as HTMLElement)?.closest?.("[data-audio-mute]")) return;
      document.removeEventListener("pointerdown", start, true);
      document.removeEventListener("keydown", start, true);
      audio.current ??= new Soundscape();
      audio.current.setVolume(volumeRef.current);
      setAudioBusy(true);
      audio.current
        .enable()
        .then(async () => {
          if (active) audioReady.current = true;
          else await audio.current?.disable();
        })
        .catch((error: unknown) => {
          if (active) {
            setSound(false);
            setMessage(
              error instanceof Error ? error.message : "Audio could not start.",
            );
          }
        })
        .finally(() => {
          setAudioBusy(false);
        });
    };
    document.addEventListener("pointerdown", start, true);
    document.addEventListener("keydown", start, true);
    return () => {
      active = false;
      document.removeEventListener("pointerdown", start, true);
      document.removeEventListener("keydown", start, true);
    };
  }, [sound]);

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
        audioReady.current = false;
        setSound(false);
      } else {
        audio.current.setVolume(volume);
        await audio.current.enable();
        audioReady.current = true;
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
    setSceneEpoch((value) => value + 1);
    setSelected(null);
    setJourneyId(id === "healthy" ? null : `lab:${id}`);
    setStep(0);
    setAutoTour(true);
    setAutopilot(true);
    setFlightEpoch((v) => v + 1);
    setIncidentControls(false);
    setModal(null);
    audio.current?.play(id === "healthy" ? "select" : "failure");
  }
  function beginJourney(id: string) {
    setScenario("healthy");
    setElapsed(0);
    setResolved(false);
    setJourneyId(id);
    const firstUnchecked =
      id === "application"
        ? flightMission(id)!.steps.findIndex(
            (s, i) => progress[`application:${i}`] !== s.lesson?.answer,
          )
        : 0;
    setStep(Math.max(0, firstUnchecked));
    setAutoTour(id !== "application");
    setPaused(false);
    setAutopilot(true);
    setFlightEpoch((v) => v + 1);
    setIncidentControls(false);
    setSelected(null);
    setModal(null);
    setLayer("all");
    audio.current?.play("select");
  }
  function leaveFlight() {
    setSceneEpoch((value) => value + 1);
    setElapsed(flightTime);
    setJourneyId(null);
    setAutoTour(false);
    setCamera(home);
    setPaused(scenario !== "healthy");
    setIncidentControls(false);
  }
  function chooseFlightStep(value: number) {
    if (
      !journey ||
      !Number.isInteger(value) ||
      value < 0 ||
      value >= journey.steps.length
    )
      return;
    setStep(value);
    setAutopilot(true);
    setPaused(false);
    setFlightEpoch((v) => v + 1);
  }
  function manualCamera(value: Camera) {
    setCamera(value);
    if (journey) {
      setAutopilot(false);
      setPaused(true);
    }
  }
  function resetWorld() {
    setSceneEpoch((value) => value + 1);
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
      className={`universe scene-first ${diagramOnly ? "diagram-only" : ""} ${scenario !== "healthy" ? "has-lab" : ""} ${journey ? "has-journey has-flight" : ""} ${journeyId === "application" ? "has-learning" : ""} ${incidentControls ? "show-incident-controls" : ""} ${paused || reducedMotion ? "motion-off" : ""}`}
    >
      <div className="world-vignette" />
      <button
        className="diagram-toggle"
        aria-pressed={diagramOnly}
        onClick={() => setDiagramOnly((value) => !value)}
      >
        <Icon name="expand" size={15} />{" "}
        {diagramOnly ? "Show learning panels" : "Diagram only"}
      </button>
      {diagramOnly && (
        <div className="diagram-audio">
          <label>
            Piano{" "}
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(volume * 100)}
              onChange={(event) => setVolume(Number(event.target.value) / 100)}
              aria-label="Diagram piano volume"
            />
          </label>
          <button
            data-audio-mute
            onClick={toggleSound}
            disabled={audioBusy}
            aria-pressed={sound}
            aria-label={sound ? "Mute piano" : "Enable piano"}
          >
            <Icon name={sound ? "volume" : "mute"} size={17} />
          </button>
        </div>
      )}
      <SpatialScene
        key={sceneEpoch}
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
        guided={autopilot}
        diagramOnly={diagramOnly}
        reducedMotion={reducedMotion}
        onSpatialView={recordSpatialView}
        onCamera={manualCamera}
        flight={
          journeyStep
            ? {
                visual: flightVisual,
                destination: destination!,
                node: journeyStep.node,
                phase: journeyStep.phase,
                stopKey,
              }
            : undefined
        }
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
          <label
            className="sound-volume"
            title="Original calming piano soundtrack volume"
          >
            <span>SOUND</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              aria-label="Background soundtrack volume"
            />
            <output>{Math.round(volume * 100)}%</output>
          </label>
          <button
            data-audio-mute
            className={`world-icon ${sound ? "sound-enabled" : ""}`}
            onClick={toggleSound}
            disabled={audioBusy}
            aria-label={sound ? "Mute sound" : "Enable sound"}
            aria-pressed={sound}
            title={
              sound
                ? "Sound on · click to mute"
                : "Enable background soundtrack and interaction sounds"
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
          Your app.
          <br />
          <em>Into Kubernetes.</em>
        </h1>
        <p>
          Learn each decision. Build your understanding.
          <br />
          See what changes when something fails.
        </p>
        <button
          onClick={() => beginJourney("application")}
          className="intro-link"
        >
          <span className="tiny-play">
            <Icon name="play" size={12} />
          </span>
          Start with your own application
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
            leaveFlight();
            setElapsed(boundedLabTime(time));
            setPaused(true);
            setResolved(false);
          }}
          onReplay={() => changeScenario(scenario)}
          onPause={() => setPaused((v) => !v)}
          onSpeed={(value) => {
            if ([0.5, 1, 2].includes(value)) setSpeed(value);
          }}
          onRepair={() => {
            setResolved(true);
            setElapsed(22);
            if (journey) {
              setStep(journey.steps.length - 1);
              setFlightEpoch((v) => v + 1);
            }
            setPaused(false);
            audio.current?.play("step");
          }}
          onRecovery={(enabled) => {
            setRecovery(enabled);
            if (journey) {
              setStep(0);
              setFlightEpoch((v) => v + 1);
            }
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
            manualCamera({ ...camera, zoom: Math.min(3.4, camera.zoom + 0.15) })
          }
          aria-label="Zoom in"
        >
          +
        </button>
        <span>{Math.round(camera.zoom * 100)}%</span>
        <button
          onClick={() =>
            manualCamera({
              ...camera,
              zoom: Math.max(0.65, camera.zoom - 0.15),
            })
          }
          aria-label="Zoom out"
        >
          −
        </button>
        <span className="tool-divider" />
        <button
          onClick={() => {
            manualCamera(home);
            setSceneEpoch((value) => value + 1);
          }}
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
        <FlightDeck
          mission={journey}
          diagramOnly={diagramOnly}
          onShowLesson={() => setDiagramOnly(false)}
          step={step}
          visual={flightVisual}
          paused={paused}
          auto={autoTour && step < journey.steps.length - 1}
          autopilot={autopilot}
          engine={
            backend.available && !backend.error
              ? "Local simulation engine"
              : "Browser simulation"
          }
          engineError={backend.available ? backend.error : ""}
          checked={
            journeyStep.lesson
              ? progress[`application:${step}`] === journeyStep.lesson.answer
              : true
          }
          completed={
            Object.entries(progress).filter(([key, answer]) => {
              const i = Number(key.split(":")[1]);
              return (
                journeyId === "application" &&
                journey.steps[i]?.lesson?.answer === answer
              );
            }).length
          }
          onAnswer={(choice) => {
            if (
              journeyStep.lesson &&
              choice === journeyStep.lesson.answer &&
              !saveUnderstanding({
                ...progress,
                [`application:${step}`]: choice,
              })
            )
              notify(
                "Understanding check saved for this session; browser storage is unavailable.",
              );
          }}
          onExample={() => {
            select(journeyStep.node);
            setTab("configure");
          }}
          onFailure={() => setModal("scenarios")}
          onCourse={() => beginJourney("application")}
          reducedMotion={reducedMotion}
          ready={sim.ready}
          desired={sim.desired}
          backends={backends}
          onStep={chooseFlightStep}
          onClose={leaveFlight}
          onOverview={leaveFlight}
          onInspect={select}
          onLab={() => setIncidentControls((v) => !v)}
          onPlay={() => {
            if (journeyStep.lesson) {
              if (
                progress[`application:${step}`] !== journeyStep.lesson.answer
              ) {
                notify(
                  "Complete this milestone's understanding check before continuing.",
                );
                return;
              }
              if (step < journey.steps.length - 1) chooseFlightStep(step + 1);
              else
                notify(
                  "Understanding journey complete. Continue with the sandbox evidence plan in Practice.",
                );
              return;
            }
            if (!autopilot) {
              setAutopilot(true);
              setFlightEpoch((v) => v + 1);
              setPaused(false);
              setAutoTour(true);
            } else if (
              paused ||
              !autoTour ||
              step === journey.steps.length - 1
            ) {
              if (step === journey.steps.length - 1) chooseFlightStep(0);
              setAutoTour(true);
              setPaused(false);
            } else {
              setPaused(true);
            }
          }}
        />
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
        <button
          className="dock-expedition"
          onClick={() => beginJourney("application")}
        >
          Application journey
        </button>
        <button
          className="dock-expedition"
          onClick={() => beginJourney("grand-tour")}
        >
          <Icon name="orbit" size={16} /> 71-stop expedition
        </button>
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
              <button
                className="component-fly"
                onClick={() => beginJourney(`visit:${component.id}`)}
              >
                <Icon name="arrow" size={16} /> Fly to this resource
              </button>
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
            <button
              className="component-fly"
              onClick={() => beginJourney("grand-tour")}
            >
              <Icon name="orbit" size={16} /> Start the 71-stop expedition
            </button>
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
              The background soundtrack starts with your first interaction.
              Adjust its volume or mute it at any time. Saved concepts stay in
              your browser. This app has no cluster credentials, deployment
              actions, or live infrastructure connection.
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
