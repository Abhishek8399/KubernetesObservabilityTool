import { applicationFrame } from "../app/lib/learning.ts";
import { randomUUID } from "node:crypto";
import { flightMission, resourceAnchor } from "../app/lib/flight.ts";
import { labFrame, visiblePods } from "../app/lib/lab.ts";
import { readyBackends, type Scenario } from "../app/lib/simulation.ts";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
interface Session {
  id: string;
  missionId: string;
  step: number;
  paused: boolean;
  recovery: boolean;
  resolved: boolean;
  revision: number;
  touched: number;
}
export class SessionStore {
  private sessions = new Map<string, Session>();
  private ttl = 30 * 60 * 1000;
  private object(input: unknown): Record<string, unknown> {
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new ApiError(400, "A JSON object is required.");
    return input as Record<string, unknown>;
  }
  private expire() {
    for (const [id, s] of this.sessions)
      if (Date.now() - s.touched > this.ttl) this.sessions.delete(id);
  }
  create(input: unknown) {
    this.expire();
    const body = this.object(input);
    if (typeof body.missionId !== "string" || !flightMission(body.missionId))
      throw new ApiError(400, "Unknown flight mission.");
    if (this.sessions.size >= 128)
      throw new ApiError(
        503,
        "Simulation session capacity reached. Try again later.",
      );
    const s: Session = {
      id: randomUUID(),
      missionId: body.missionId,
      step: 0,
      paused: false,
      recovery: false,
      resolved: false,
      revision: 0,
      touched: Date.now(),
    };
    this.sessions.set(s.id, s);
    return this.snapshot(s);
  }
  private find(id: string) {
    this.expire();
    const s = this.sessions.get(id);
    if (!s) throw new ApiError(404, "Simulation session not found or expired.");
    s.touched = Date.now();
    return s;
  }
  get(id: string) {
    return this.snapshot(this.find(id));
  }
  delete(id: string) {
    this.find(id);
    this.sessions.delete(id);
  }
  update(id: string, input: unknown) {
    const s = this.find(id),
      b = this.object(input);
    if (b.revision !== s.revision)
      throw new ApiError(
        409,
        "Session revision changed. Read the current session before retrying.",
      );
    for (const key of ["paused", "recovery", "resolved"] as const)
      if (typeof b[key] !== "boolean")
        throw new ApiError(400, `${key} must be a boolean.`);
    const mission = flightMission(
      s.missionId,
      b.recovery as boolean,
      b.resolved as boolean,
    )!;
    if (
      !Number.isInteger(b.step) ||
      (b.step as number) < 0 ||
      (b.step as number) >= mission.steps.length
    )
      throw new ApiError(400, "Flight stop is outside the mission.");
    s.step = b.step as number;
    s.paused = b.paused as boolean;
    s.recovery = b.recovery as boolean;
    s.resolved = b.resolved as boolean;
    s.revision++;
    return this.snapshot(s);
  }
  private snapshot(s: Session) {
    const mission = flightMission(s.missionId, s.recovery, s.resolved)!;
    const stop = mission.steps[s.step];
    const scenario: Scenario = s.missionId.startsWith("lab:")
      ? (s.missionId.slice(4) as Scenario)
      : "healthy";
    const frame =
      s.missionId === "application"
        ? applicationFrame(s.step)
        : labFrame(scenario, stop.time ?? 0, s.recovery, s.resolved);
    return {
      ...s,
      mission,
      destination: stop.anchor ?? resourceAnchor(stop.node),
      frame,
      backends: readyBackends(frame.simulation),
      pods: [0, 1, 2].flatMap((z) => visiblePods(scenario, frame, z)),
    };
  }
}
