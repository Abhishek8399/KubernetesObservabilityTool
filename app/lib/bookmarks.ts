const key = "kubernetes-observatory-saved";
const eventName = "kubernetes-observatory-saved-change";
let fallback = "[]";
let sessionOnly = false;
export function parseBookmarks(
  raw: string,
  allowed: ReadonlySet<string>,
): string[] {
  if (raw.length > 20000) return [];
  try {
    const values: unknown = JSON.parse(raw);
    return Array.isArray(values)
      ? [
          ...new Set(
            values.filter(
              (value): value is string =>
                typeof value === "string" && allowed.has(value),
            ),
          ),
        ].slice(0, allowed.size)
      : [];
  } catch {
    return [];
  }
}
export function bookmarkSnapshot(): string {
  if (typeof window === "undefined") return "[]";
  if (sessionOnly) return fallback;
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
export function subscribeBookmarks(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(eventName, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(eventName, listener);
  };
}
export function saveBookmarks(values: string[]): boolean {
  fallback = JSON.stringify(values);
  let persisted = true;
  try {
    localStorage.setItem(key, fallback);
    sessionOnly = false;
  } catch {
    persisted = false;
    sessionOnly = true;
  }
  window.dispatchEvent(new Event(eventName));
  return persisted;
}
