import type { SemanticDefaults } from "./types";

export const MODEL_VERSION = "ivone-intent-linear-int8-1.0.0";
export const SCHEMA_VERSION = "1.0" as const;

export const DEFAULT_SEMANTICS: SemanticDefaults = {
  coordinateSystem: {
    upAxis: "y",
    forwardAxis: "-z",
    handedness: "right",
    units: "scene-unit",
    ground: 0
  },
  directionDistance: 1,
  screenHalfWidth: 3,
  screenHalfHeight: 2.5,
  movementStyles: {
    normal: { speed: 1, acceleration: 1, gait: "walk" },
    slowly: { speed: 0.5, acceleration: 0.7, gait: "walk" },
    quickly: { speed: 2, acceleration: 1.6, gait: "run" },
    rush: { speed: 2.5, acceleration: 2, gait: "run" },
    scoot: { speed: 1.4, acceleration: 1.4, gait: "walk" }
  },
  durations: {
    move: 1,
    rotate: 0.5,
    scale: 0.5,
    appearance: 0,
    clip: 1,
    cameraMove: 2,
    cameraTrack: 3,
    cameraFocus: 0.4,
    interact: 0.8,
    fall: 1.25,
    wait: 1
  },
  easing: {
    default: "smooth",
    linear: "linear",
    gravity: "gravity",
    gently: "ease-in-out",
    suddenly: "ease-out"
  },
  groundClearance: {
    box: 0.5,
    cube: 0.5,
    sphere: 0.5,
    character: 0,
    robot: 0,
    default: 0
  },
  fuzzyEntityThreshold: 0.78,
  maximumTimelineDuration: 120
};
