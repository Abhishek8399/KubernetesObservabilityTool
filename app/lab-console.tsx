"use client";
import { chapterTimes, labDuration, type LabFrame } from "./lib/lab";
import { scenarios, readyBackends, type Scenario } from "./lib/simulation";
import { conceptById } from "./data/concepts";
import { Icon } from "./icons";
type Props = {
  frame: LabFrame;
  scenario: Scenario;
  paused: boolean;
  speed: number;
  recovery: boolean;
  onSeek: (time: number) => void;
  onReplay: () => void;
  onPause: () => void;
  onSpeed: (speed: number) => void;
  onRepair: () => void;
  onRecovery: (enabled: boolean) => void;
  onClose: () => void;
  onInspect: (id: string) => void;
  onChoose: () => void;
};
export default function LabConsole(p: Props) {
  const { frame: f } = p,
    s = f.simulation;
  return (
    <section
      className={`lab-console ${readyBackends(s) === 0 ? "lab-outage" : ""}`}
      aria-label="Interactive failure lesson"
    >
      <div className="lab-heading">
        <span>
          <Icon name="pulse" size={16} /> FAILURE LAB <small>SIMULATED</small>
        </span>
        <button onClick={p.onClose} aria-label="Close failure lesson">
          <Icon name="close" size={16} />
        </button>
      </div>
      <button className="lab-scenario-name" onClick={p.onChoose}>
        {scenarios.find((v) => v.id === p.scenario)?.title}
        <Icon name="chevron" size={14} />
      </button>
      <div className="lab-metrics">
        <span>
          <strong>
            {s.ready}
            <small>/{s.desired}</small>
          </strong>
          Ready Pods
        </span>
        <span>
          <strong>{s.nodes}</strong>Primary nodes
        </span>
        <span>
          <strong>
            {readyBackends(s) > 0 ? (s.secondaryActive ? "DR" : "OK") : "FAIL"}
          </strong>
          Request path
        </span>
      </div>
      <div className="lab-availability">
        <i />
        {readyBackends(s) > 0
          ? s.secondaryActive
            ? "Six standby backends serve; primary is offline"
            : "Requests have ready backends"
          : "Requests fail, even if Pods remain ready"}
        {s.pending > 0 && <b>{s.pending} waiting</b>}
      </div>
      <div className="lab-chapters">
        {["Before", "Impact", "Response", "Outcome"].map((title, i) => (
          <button
            key={title}
            className={i === f.index ? "active" : i < f.index ? "complete" : ""}
            aria-current={i === f.index ? "step" : undefined}
            onClick={() => p.onSeek(chapterTimes[i])}
          >
            <span>{i + 1}</span>
            {title}
          </button>
        ))}
      </div>
      <div className="lab-explanation" aria-live="polite" aria-atomic="true">
        <span>
          CHAPTER {f.index + 1} / 4 ·{" "}
          {p.paused ? "PAUSED" : f.complete ? "FINISHED" : "PLAYING"}
        </span>
        <h2>{f.chapter.title}</h2>
        <p>{f.chapter.body}</p>
      </div>
      <div className="lab-actors">
        {f.chapter.focus
          .filter((id) => conceptById[id])
          .map((id) => (
            <button key={id} onClick={() => p.onInspect(id)}>
              {conceptById[id].title}
              <Icon name="arrow" size={12} />
            </button>
          ))}
      </div>
      {p.scenario === "region-failure" && (
        <label className="lab-recovery">
          <input
            type="checkbox"
            checked={p.recovery}
            onChange={(e) => p.onRecovery(e.target.checked)}
          />
          <span>Use a separately designed standby</span>
        </label>
      )}
      {f.repairLabel && (
        <button className="lab-repair" onClick={p.onRepair}>
          <Icon name="check" size={16} />
          {f.repairLabel}
          <span>SIMULATED ACTION</span>
        </button>
      )}
      <label className="lab-scrubber">
        <span>Replay any point in the lesson</span>
        <input
          type="range"
          min="0"
          max={labDuration}
          step=".25"
          value={f.time}
          onChange={(e) => p.onSeek(Number(e.target.value))}
          aria-label="Failure lesson timeline"
          aria-valuetext={`Chapter ${f.index + 1}: ${f.chapter.title}`}
        />
      </label>
      <div className="lab-playback">
        <div>
          <button
            onClick={() => p.onSeek(chapterTimes[Math.max(0, f.index - 1)])}
            disabled={f.index === 0}
            aria-label="Previous failure chapter"
          >
            ←
          </button>
          <button
            onClick={f.complete ? p.onReplay : p.onPause}
            aria-label={
              f.complete
                ? "Replay failure lesson"
                : p.paused
                  ? "Play failure lesson"
                  : "Pause failure lesson"
            }
          >
            <Icon
              name={f.complete ? "reset" : p.paused ? "play" : "pause"}
              size={15}
            />
          </button>
          <button
            onClick={() => p.onSeek(chapterTimes[Math.min(3, f.index + 1)])}
            disabled={f.index === 3}
            aria-label="Next failure chapter"
          >
            →
          </button>
        </div>
        <span>
          {Math.floor(f.time).toString().padStart(2, "0")} / {labDuration}s
        </span>
        <label>
          <span className="sr-only">Playback speed</span>
          <select
            value={p.speed}
            onChange={(e) => p.onSpeed(Number(e.target.value))}
          >
            <option value="0.5">0.5×</option>
            <option value="1">1×</option>
            <option value="2">2×</option>
          </select>
        </label>
        <button onClick={p.onReplay} className="lab-replay">
          <Icon name="reset" size={13} />
          Replay
        </button>
      </div>
      <div className="pod-reading-key" aria-label="Pod state legend">
        <span>
          <i className="state-ready" />
          Ready
        </span>
        <span>
          <i className="state-starting" />
          Starting / Pending
        </span>
        <span>
          <i className="state-lost" />
          Lost / Offline
        </span>
      </div>
      <p className="lab-footnote">
        Lesson time is accelerated. Infrastructure detection, startup, eviction
        and restore timings vary.
      </p>
    </section>
  );
}
