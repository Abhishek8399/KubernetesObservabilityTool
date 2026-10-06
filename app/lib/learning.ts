import { labFrame, type LabFrame } from "./lab.ts";

export function applicationFrame(step: number): LabFrame {
  const frame = labFrame("healthy", 0, false);
  const desired = step < 5 ? 0 : step < 10 ? 2 : 4;
  const ready = step < 8 ? 0 : desired;
  const serviceAvailable = step >= 9;
  frame.simulation = {
    ...frame.simulation,
    desired,
    ready,
    pending: desired - ready,
    serviceAvailable,
    phase:
      desired === 0
        ? "Preparing application manifests"
        : ready === 0
          ? "Application replicas starting"
          : "Application replicas ready",
  };
  frame.learning = { step, desired, ready, serviceAvailable };
  return frame;
}
const key = "kubernetes-observatory-understanding-v1";
const event = "kubernetes-understanding-changed";
let memory = "{}";
let sessionOnly = false;
export function understandingSnapshot() {
  if (sessionOnly) return memory;
  try {
    return localStorage.getItem(key) ?? memory;
  } catch {
    return memory;
  }
}
export function subscribeUnderstanding(listener: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === key || e.key === null) listener();
  };
  window.addEventListener(event, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(event, listener);
    window.removeEventListener("storage", onStorage);
  };
}
export function parseUnderstanding(raw: string): Record<string, number> {
  try {
    if (raw.length > 8192) return {};
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    return Object.fromEntries(
      Object.entries(data).filter(
        ([k, v]) =>
          /^application:\d{1,2}$/.test(k) &&
          Number.isInteger(v) &&
          (v as number) >= 0 &&
          (v as number) < 3,
      ),
    ) as Record<string, number>;
  } catch {
    return {};
  }
}
export function saveUnderstanding(values: Record<string, number>) {
  memory = JSON.stringify(values);
  let persistent = true;
  try {
    localStorage.setItem(key, memory);
    sessionOnly = false;
  } catch {
    persistent = false;
    sessionOnly = true;
  }
  window.dispatchEvent(new Event(event));
  return persistent;
}
