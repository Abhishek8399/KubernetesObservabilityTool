"use client";
import { useEffect, useRef, useState } from "react";
import { flightPose, type FlightCamera, type Point } from "./lib/flight";
import type { SpatialView } from "./lib/spatial";

export interface FlightVisual {
  key: string;
  from: Point;
  to: Point;
  ship: Point;
  angle: number;
  progress: number;
  travelProgress: number;
  phase: string;
  initialZoom: number;
  camera: FlightCamera;
  previous?: boolean;
  spatialStart?: SpatialView | null;
}
const flightDuration = 3400;

/** One finite camera flight per stop. Pausing preserves elapsed travel time. */
export function useFlightCamera({
  destination,
  stopKey,
  enabled,
  paused,
  reducedMotion,
  camera,
  onCamera,
  getSpatialView,
}: {
  destination: Point | undefined;
  stopKey: string;
  enabled: boolean;
  paused: boolean;
  reducedMotion: boolean;
  camera: FlightCamera;
  onCamera: (camera: FlightCamera) => void;
  getSpatialView?: () => SpatialView | null;
}) {
  const latestCamera = useRef(camera);
  const plan = useRef<{
    key: string;
    from: Point;
    to: Point;
    camera: FlightCamera;
    elapsed: number;
    spatialStart?: SpatialView | null;
  } | null>(null);
  const [visual, setVisual] = useState<FlightVisual | null>(null);
  useEffect(() => {
    latestCamera.current = camera;
  }, [camera]);
  const x = destination?.x,
    y = destination?.y;
  useEffect(() => {
    if (!enabled || x === undefined || y === undefined || paused) return;
    let previous: number | null = null;
    let handle: number;
    if (plan.current?.key !== stopKey) {
      const to = { x, y };
      const from = plan.current
        ? flightPose(
            plan.current.camera,
            plan.current.from,
            plan.current.to,
            plan.current.elapsed / flightDuration,
          ).ship
        : {
            x:
              (900 - latestCamera.current.x - 900) / latestCamera.current.zoom +
              900,
            y:
              (520 - latestCamera.current.y - 580) / latestCamera.current.zoom +
              580,
          };
      plan.current = {
        key: stopKey,
        from,
        to,
        camera: latestCamera.current,
        elapsed: 0,
        spatialStart: getSpatialView?.(),
      };
    }
    function tick(now: number) {
      const p = plan.current;
      if (!p) return;
      // No background-tab jump. Only actual active animation frames advance travel.
      p.elapsed = reducedMotion
        ? flightDuration
        : Math.min(
            flightDuration,
            p.elapsed + (previous === null ? 0 : Math.min(64, now - previous)),
          );
      previous = now;
      const pose = flightPose(
        p.camera,
        p.from,
        p.to,
        p.elapsed / flightDuration,
      );
      onCamera(pose.camera);
      setVisual({
        ...pose,
        key: p.key,
        from: p.from,
        to: p.to,
        initialZoom: p.camera.zoom,
        spatialStart: p.spatialStart,
      });
      if (p.elapsed < flightDuration) handle = requestAnimationFrame(tick);
    }
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [enabled, paused, reducedMotion, stopKey, x, y, onCamera, getSpatialView]);
  // Keep the last pose until the next animation frame installs a new plan.
  // Returning null here would briefly frame the new destination before departure.
  return visual?.key === stopKey
    ? visual
    : visual
      ? { ...visual, previous: true }
      : null;
}
