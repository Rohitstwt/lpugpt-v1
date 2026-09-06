import { haversineDistance } from "@/lib/maps/campus-coordinates";

export type ManeuverKind =
  | "depart"
  | "arrive"
  | "turn-left"
  | "turn-right"
  | "slight-left"
  | "slight-right"
  | "sharp-left"
  | "sharp-right"
  | "straight"
  | "uturn"
  | "roundabout"
  | "fork"
  | "unknown";

export type RouteStep = {
  instruction: string;
  lat: number;
  lng: number;
  distanceM: number;
  durationS: number;
  maneuver: ManeuverKind;
  streetName?: string;
};

export type RoutePath = Array<{ lat: number; lng: number }>;

export type NavigationSnapshot = {
  stepIndex: number;
  currentStep: RouteStep | null;
  nextStep: RouteStep | null;
  distanceToManeuverM: number;
  distanceRemainingM: number;
  etaSeconds: number;
  progressPercent: number;
  arrived: boolean;
  primaryText: string;
  secondaryText: string;
  voiceText: string;
};

const ARRIVE_THRESHOLD_M = 18;
const STEP_ADVANCE_THRESHOLD_M = 14;

export function parseManeuver(
  type?: string,
  modifier?: string
): ManeuverKind {
  const t = (type || "").toLowerCase();
  const m = (modifier || "").toLowerCase();

  if (t === "arrive") return "arrive";
  if (t === "depart") return "depart";
  if (t === "roundabout" || t === "rotary") return "roundabout";
  if (t === "fork") return "fork";
  if (m.includes("uturn") || m === "uturn") return "uturn";

  if (m.includes("sharp left")) return "sharp-left";
  if (m.includes("sharp right")) return "sharp-right";
  if (m.includes("slight left")) return "slight-left";
  if (m.includes("slight right")) return "slight-right";
  if (m === "left") return "turn-left";
  if (m === "right") return "turn-right";
  if (m === "straight" || t === "continue" || t === "new name") return "straight";

  return "unknown";
}

export function maneuverLabel(kind: ManeuverKind): string {
  switch (kind) {
    case "depart":
      return "Head";
    case "arrive":
      return "Arrive";
    case "turn-left":
      return "Turn left";
    case "turn-right":
      return "Turn right";
    case "slight-left":
      return "Slight left";
    case "slight-right":
      return "Slight right";
    case "sharp-left":
      return "Sharp left";
    case "sharp-right":
      return "Sharp right";
    case "straight":
      return "Continue straight";
    case "uturn":
      return "Make a U-turn";
    case "roundabout":
      return "Enter roundabout";
    case "fork":
      return "Keep";
    default:
      return "Continue";
  }
}

export function formatMeters(m: number): string {
  if (m < 20) return "now";
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export function formatEta(seconds: number): string {
  if (seconds < 60) return "< 1 min";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function buildInstruction(kind: ManeuverKind, streetName?: string): string {
  const base = maneuverLabel(kind);
  if (streetName?.trim()) {
    if (kind === "arrive") return `${base} at ${streetName}`;
    if (kind === "depart") return `${base} on ${streetName}`;
    return `${base} onto ${streetName}`;
  }
  return base;
}

export function parseOsrmStep(raw: {
  maneuver?: {
    type?: string;
    modifier?: string;
    location?: [number, number];
  };
  name?: string;
  distance?: number;
  duration?: number;
}): RouteStep | null {
  const loc = raw.maneuver?.location;
  if (!loc) return null;

  const maneuver = parseManeuver(raw.maneuver?.type, raw.maneuver?.modifier);
  const streetName = raw.name?.trim() || undefined;

  return {
    lat: loc[1],
    lng: loc[0],
    distanceM: raw.distance ?? 0,
    durationS: raw.duration ?? 0,
    maneuver,
    streetName,
    instruction: buildInstruction(maneuver, streetName),
  };
}

/** Closest point on polyline + distance traveled along route (meters). */
export function snapToRoute(
  lat: number,
  lng: number,
  path: RoutePath
): { index: number; traveledM: number; offRouteM: number } {
  if (path.length < 2) {
    return { index: 0, traveledM: 0, offRouteM: 0 };
  }

  let bestIdx = 0;
  let bestDist = Infinity;
  let traveled = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const segLen = haversineDistance(a.lat, a.lng, b.lat, b.lng);
    const t = projectOnSegment(lat, lng, a.lat, a.lng, b.lat, b.lng);
    const px = a.lat + t * (b.lat - a.lat);
    const py = a.lng + t * (b.lng - a.lng);
    const d = haversineDistance(lat, lng, px, py);

    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
      traveled =
        path.slice(0, i).reduce((sum, p, j) => {
          const n = path[j + 1];
          return n ? sum + haversineDistance(p.lat, p.lng, n.lat, n.lng) : sum;
        }, 0) +
        t * segLen;
    }
  }

  return { index: bestIdx, traveledM: traveled, offRouteM: bestDist };
}

function projectOnSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return 0;
  return Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
}

export function pathLengthM(path: RoutePath): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    total += haversineDistance(
      path[i].lat,
      path[i].lng,
      path[i + 1].lat,
      path[i + 1].lng
    );
  }
  return total;
}

function findActiveStepIndex(
  lat: number,
  lng: number,
  steps: RouteStep[]
): number {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const dist = haversineDistance(lat, lng, step.lat, step.lng);
    if (dist > STEP_ADVANCE_THRESHOLD_M) return i;
  }
  return Math.max(0, steps.length - 1);
}

export function computeNavigationState(input: {
  userLat: number;
  userLng: number;
  destLat: number;
  destLng: number;
  steps: RouteStep[];
  path: RoutePath;
  totalDistanceM: number;
  totalDurationS: number;
}): NavigationSnapshot {
  const {
    userLat,
    userLng,
    destLat,
    destLng,
    steps,
    path,
    totalDistanceM,
    totalDurationS,
  } = input;

  const distToDest = haversineDistance(userLat, userLng, destLat, destLng);
  if (distToDest <= ARRIVE_THRESHOLD_M) {
    return {
      stepIndex: steps.length - 1,
      currentStep: steps[steps.length - 1] ?? null,
      nextStep: null,
      distanceToManeuverM: 0,
      distanceRemainingM: 0,
      etaSeconds: 0,
      progressPercent: 100,
      arrived: true,
      primaryText: "You have arrived",
      secondaryText: "Navigation complete",
      voiceText: "You have arrived at your destination",
    };
  }

  const snap = snapToRoute(userLat, userLng, path);
  const routeLen = totalDistanceM > 0 ? totalDistanceM : pathLengthM(path);
  const distanceRemainingM = Math.max(0, routeLen - snap.traveledM);
  const progressPercent =
    routeLen > 0
      ? Math.min(100, Math.round((snap.traveledM / routeLen) * 100))
      : 0;
  const etaSeconds =
    routeLen > 0
      ? Math.round((distanceRemainingM / routeLen) * totalDurationS)
      : Math.round(distanceRemainingM / 1.4);

  const stepIndex = findActiveStepIndex(userLat, userLng, steps);
  const currentStep = steps[stepIndex] ?? null;
  const nextStep = steps[stepIndex + 1] ?? null;

  const distanceToManeuverM = currentStep
    ? haversineDistance(userLat, userLng, currentStep.lat, currentStep.lng)
    : distToDest;

  let primaryText: string;
  let secondaryText: string;
  let voiceText: string;

  if (currentStep?.maneuver === "arrive") {
    primaryText = "You have arrived";
    secondaryText = currentStep.streetName || "at destination";
    voiceText = `You have arrived${currentStep.streetName ? ` at ${currentStep.streetName}` : ""}`;
  } else if (currentStep) {
    primaryText = maneuverLabel(currentStep.maneuver);
    if (currentStep.streetName && currentStep.maneuver !== "depart") {
      secondaryText = `onto ${currentStep.streetName}`;
    } else if (nextStep?.streetName) {
      secondaryText = `towards ${nextStep.streetName}`;
    } else {
      secondaryText = "follow the route";
    }

    const distLabel = formatMeters(distanceToManeuverM);
    voiceText =
      distLabel === "now"
        ? `${primaryText} now`
        : `${primaryText} in ${distLabel}`;
  } else {
    primaryText = "Head towards destination";
    secondaryText = `${formatMeters(distanceRemainingM)} remaining`;
    voiceText = primaryText;
  }

  return {
    stepIndex,
    currentStep,
    nextStep,
    distanceToManeuverM,
    distanceRemainingM,
    etaSeconds,
    progressPercent,
    arrived: false,
    primaryText,
    secondaryText,
    voiceText,
  };
}

export function remainingPath(
  path: RoutePath,
  traveledM: number
): RoutePath {
  if (path.length < 2 || traveledM <= 0) return path;

  let acc = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const seg = haversineDistance(
      path[i].lat,
      path[i].lng,
      path[i + 1].lat,
      path[i + 1].lng
    );
    if (acc + seg >= traveledM) {
      const t = (traveledM - acc) / seg;
      const start = {
        lat: path[i].lat + t * (path[i + 1].lat - path[i].lat),
        lng: path[i].lng + t * (path[i + 1].lng - path[i].lng),
      };
      return [start, ...path.slice(i + 1)];
    }
    acc += seg;
  }
  return [path[path.length - 1]];
}
