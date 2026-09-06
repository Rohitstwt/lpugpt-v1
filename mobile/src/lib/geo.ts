export type CampusPlace = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  description?: string;
  category: string;
};

export const YOUR_LOCATION_ID = "__your_location__";

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatMeters(m: number): string {
  if (m < 20) return "now";
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export type RouteStep = {
  instruction: string;
  lat: number;
  lng: number;
  distanceM: number;
};

export function parseOsrmStep(raw: {
  maneuver?: {
    type?: string;
    modifier?: string;
    location?: [number, number];
  };
  name?: string;
  distance?: number;
}): RouteStep | null {
  const loc = raw.maneuver?.location;
  if (!loc) return null;

  const type = (raw.maneuver?.type || "").toLowerCase();
  const mod = (raw.maneuver?.modifier || "").toLowerCase();
  let action = "Continue";
  if (type === "arrive") action = "Arrive";
  else if (type === "depart") action = "Head";
  else if (mod.includes("left")) action = "Turn left";
  else if (mod.includes("right")) action = "Turn right";
  else if (mod === "straight" || type === "continue") action = "Continue straight";

  const street = raw.name?.trim();
  const instruction = street
    ? `${action} onto ${street}`
    : action;

  return {
    instruction,
    lat: loc[1],
    lng: loc[0],
    distanceM: raw.distance ?? 0,
  };
}
