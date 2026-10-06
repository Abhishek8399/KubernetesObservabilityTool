"use client";
import { conceptById, getColor, layers } from "./data/concepts";
import { Icon } from "./icons";
import LessonCheckpoint from "./lesson-checkpoint";
import { isLogicalStop, type FlightMission } from "./lib/flight";
import type { FlightVisual } from "./use-flight-camera";
import type { CSSProperties } from "react";

export default function FlightDeck(p: {
  checked: boolean;
  completed: number;
  onAnswer: (choice: number) => void;
  onExample: () => void;
  onFailure: () => void;
  onCourse: () => void;
  mission: FlightMission;
  step: number;
  visual: FlightVisual | null;
  paused: boolean;
  auto: boolean;
  engine: string;
  engineError: string;
  autopilot: boolean;
  reducedMotion: boolean;
  ready: number;
  desired: number;
  backends: number;
  onStep: (step: number) => void;
  onPlay: () => void;
  onClose: () => void;
  onInspect: (id: string) => void;
  onOverview: () => void;
  onLab: () => void;
}) {
  const stop = p.mission.steps[p.step],
    c = conceptById[stop.node];
  const last = p.step === p.mission.steps.length - 1;
  const arrived = p.visual?.progress === 1;
  const status = !p.autopilot
    ? "MANUAL CAMERA"
    : p.paused
      ? "FLIGHT PAUSED"
      : arrived
        ? "RESOURCE STOP"
        : "TRAVELLING";
  return (
    <div
      className="flight-interface"
      style={{ "--flight-color": getColor(c.layer) } as CSSProperties}
    >
      <div className="flight-topline">
        <span className="flight-signal">
          <i /> EXPEDITION MODE <b>{status}</b>
        </span>
        <button onClick={p.onClose}>
          <Icon name="close" size={14} /> Leave flight
        </button>
      </div>
      <aside className="flight-coordinate" aria-hidden="true">
        <span>DESTINATION {String(p.step + 1).padStart(2, "0")}</span>
        <strong>{c.title}</strong>
        <span>
          {layers.find((l) => l.id === c.layer)?.label} / {c.kind}
        </span>
        <small>
          {p.visual?.phase ?? "Plotting course"}{" "}
          {p.visual && `${Math.round(p.visual.progress * 100)}%`}
        </small>
      </aside>
      <aside className="flight-manifest">
        <span>FLIGHT PLAN</span>
        <small className="engine-status">
          {p.engine}
          {p.engineError && (
            <span role="status">
              {" "}
              ? Connection interrupted; browser simulation continues.
            </span>
          )}
        </small>
        <label htmlFor="flight-stop">{p.mission.title}</label>
        <select
          id="flight-stop"
          value={p.step}
          onChange={(e) => p.onStep(Number(e.target.value))}
        >
          {p.mission.steps.map((s, i) => (
            <option value={i} key={i}>
              {String(i + 1).padStart(2, "0")} · {conceptById[s.node].title} —{" "}
              {s.title}
            </option>
          ))}
        </select>
        {stop.lesson && (
          <div className="learning-milestone-progress">
            <b>
              {p.completed} / {p.mission.steps.length}
            </b>{" "}
            understanding checks completed
            <small>
              Practice evidence is a separate milestone. Dimmed resources are
              planned; amber Pods are starting; green Pods are ready.
            </small>
          </div>
        )}
        <div className="flight-manifest-stats">
          <span>
            <b>
              {p.ready}/{p.desired}
            </b>{" "}
            Ready Pods
          </span>
          <span>
            <b>{p.backends}</b> Serving backends
          </span>
        </div>
        <p>
          {stop.phase === "Outbound request" ||
          stop.phase === "Response returns"
            ? "The ship follows a logical request journey. Exact network hops depend on the implementation."
            : stop.phase === "Discovery"
              ? "DNS is a discovery step before the connection, not an HTTP forwarding hop."
              : "The ship is your guide. These connections illustrate control and dependency relationships, not application packet hops."}
        </p>
        <button onClick={p.onOverview}>
          <Icon name="expand" size={14} /> Explore the map
        </button>
        {p.mission.id.startsWith("lab:") && (
          <button onClick={p.onLab}>
            <Icon name="pulse" size={14} /> Open incident controls
          </button>
        )}
        {p.mission.id.startsWith("lab:") && (
          <button onClick={p.onCourse}>Return to application journey</button>
        )}
        {p.reducedMotion && (
          <small>
            Reduced motion: destinations change without camera travel.
          </small>
        )}
      </aside>
      <section
        className="flight-caption"
        aria-label="Flight resource explanation"
      >
        <div className="flight-caption-heading">
          <span>
            <i /> {stop.phase.toUpperCase()}
          </span>
          <span>
            STOP {p.step + 1} / {p.mission.steps.length}
          </span>
        </div>
        <div
          className="flight-caption-content"
          key={`${p.mission.id}:${p.step}`}
        >
          <div className="flight-purpose">
            <small>WHY THIS RESOURCE EXISTS</small>
            <strong>{c.title}</strong>
            <p>{c.summary}</p>
            <span>
              {isLogicalStop(c.id)
                ? "Logical close-up at its owning resource"
                : c.kind === "Core"
                  ? "Native Kubernetes component"
                  : `${c.kind} · implementation-dependent`}
            </span>
          </div>
          {stop.lesson ? (
            <LessonCheckpoint
              key={`${p.mission.id}:${p.step}`}
              stop={stop}
              checked={p.checked}
              onAnswer={p.onAnswer}
              onExample={p.onExample}
              onFailure={p.onFailure}
              index={p.step}
            />
          ) : (
            <div
              className="flight-action"
              aria-live="polite"
              aria-atomic="true"
            >
              <small>WHAT HAPPENS AT THIS STOP</small>
              <h2>{stop.title}</h2>
              <p>{stop.body}</p>
            </div>
          )}
        </div>
        <div className="flight-controls">
          <button onClick={() => p.onInspect(stop.node)}>
            <Icon name="layers" size={14} /> Resource details
          </button>
          <div>
            <button
              disabled={p.step === 0}
              onClick={() => p.onStep(p.step - 1)}
              aria-label="Previous flight stop"
            >
              ←
            </button>
            <button
              className="flight-play"
              onClick={p.onPlay}
              disabled={!!stop.lesson && !p.checked}
              aria-label={
                stop.lesson
                  ? last
                    ? "Finish learning journey"
                    : "Next learning milestone"
                  : !p.autopilot
                    ? "Resume guided camera"
                    : p.paused || !p.auto
                      ? "Continue automatic flight"
                      : "Pause automatic flight"
              }
            >
              <Icon
                name={p.paused || !p.auto || !p.autopilot ? "play" : "pause"}
                size={14}
              />
              {stop.lesson
                ? last
                  ? "Finish journey"
                  : "Next milestone"
                : !p.autopilot
                  ? "Resume flight"
                  : p.paused || !p.auto
                    ? last
                      ? "Replay flight"
                      : "Continue"
                    : "Pause"}
            </button>
            <button
              disabled={last || (!!stop.lesson && !p.checked)}
              onClick={() => p.onStep(p.step + 1)}
              aria-label="Next flight stop"
            >
              →
            </button>
          </div>
          <span>
            {last && arrived
              ? "Expedition complete · revisit any stop"
              : "Next: " +
                conceptById[
                  p.mission.steps[
                    Math.min(p.step + 1, p.mission.steps.length - 1)
                  ].node
                ].title}
          </span>
        </div>
        <div className="flight-route-progress" aria-hidden="true">
          <i
            style={{
              width: `${((p.step + (arrived ? 1 : 0.5)) / p.mission.steps.length) * 100}%`,
            }}
          />
        </div>
      </section>
    </div>
  );
}
