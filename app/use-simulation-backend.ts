"use client";
import { useEffect, useRef, useState } from "react";
import type { FlightMission } from "./lib/flight";
import type { LabFrame } from "./lib/lab";
interface BackendSnapshot {
  id: string;
  revision: number;
  missionId: string;
  step: number;
  recovery: boolean;
  resolved: boolean;
  paused: boolean;
  mission: FlightMission;
  frame: LabFrame;
}
async function request(path: string, options?: RequestInit): Promise<unknown> {
  const response = await fetch(path, {
    ...options,
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok)
    throw new Error(`Simulation engine returned ${response.status}.`);
  return response.status === 204 ? null : response.json();
}
function snapshot(value: unknown): BackendSnapshot {
  const v = value as BackendSnapshot;
  if (
    !v ||
    typeof v.id !== "string" ||
    !Number.isInteger(v.revision) ||
    !v.frame?.simulation ||
    !Array.isArray(v.mission?.steps)
  )
    throw new Error("Invalid simulation engine response.");
  return v;
}
export function useSimulationBackend(
  missionId: string | null,
  step: number,
  recovery: boolean,
  resolved: boolean,
  paused: boolean,
) {
  const [available, setAvailable] = useState(false),
    [state, setState] = useState<BackendSnapshot | null>(null),
    [error, setError] = useState("");
  const current = useRef<BackendSnapshot | null>(null);
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    // GitHub Pages stays a self-contained demo. The local app uses its same-origin API.
    if (location.hostname.endsWith("github.io")) return;
    request("/api/health")
      .then((value) => {
        if (
          active &&
          (value as { engine?: string }).engine ===
            "kubernetes-educational-simulator"
        )
          setAvailable(true);
      })
      .catch(() => {
        if (active)
          setError("Local engine unavailable; running the browser simulation.");
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!available || !missionId) return;
    let active = true;
    queue.current = queue.current.then(async () => {
      if (!active) return;
      try {
        if (current.current?.missionId !== missionId) {
          if (current.current)
            await request(`/api/sessions/${current.current.id}`, {
              method: "DELETE",
            });
          current.current = snapshot(
            await request("/api/sessions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ missionId }),
            }),
          );
        }
        const s = current.current!;
        const next = snapshot(
          await request(`/api/sessions/${s.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              revision: s.revision,
              step,
              recovery,
              resolved,
              paused,
            }),
          }),
        );
        current.current = next;
        if (active) {
          setState(next);
          setError("");
        }
      } catch (failure) {
        current.current = null;
        if (active)
          setError(
            failure instanceof Error
              ? failure.message
              : "Simulation synchronization failed.",
          );
      }
    });
    return () => {
      active = false;
    };
  }, [available, missionId, step, recovery, resolved, paused]);
  const matching =
    state?.missionId === missionId &&
    state.step === step &&
    state.recovery === recovery &&
    state.resolved === resolved;
  return { frame: matching ? state.frame : null, available, error };
}
