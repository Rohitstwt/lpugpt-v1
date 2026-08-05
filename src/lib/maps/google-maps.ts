import {
  buildMapsDirectionsUrl,
  CAMPUS_BLOCKS,
  CAMPUS_PLACES,
  estimateWalkTime,
  haversineDistance,
  LPU_CENTER,
  resolveLocation,
} from "./campus-coordinates";
import { formatDistance, formatDuration } from "@/lib/utils";
import type { RouteCardData } from "@/types/ui-blocks";

export type RouteResult = RouteCardData;

export function computeRoute(fromText: string, toText: string): RouteResult | null {
  const from = resolveLocation(fromText);
  const to = resolveLocation(toText);

  if (!from || !to) return null;

  const distanceM = haversineDistance(from.lat, from.lng, to.lat, to.lng);
  const durationS = estimateWalkTime(distanceM);

  const landmarks: string[] = [];
  for (const place of CAMPUS_PLACES) {
    const d = haversineDistance(from.lat, from.lng, place.lat, place.lng);
    if (d < distanceM * 0.6 && d > 50) {
      landmarks.push(place.name);
    }
  }

  const steps = [
    `Start at ${from.name}`,
    `Walk towards ${to.name}`,
    ...landmarks.slice(0, 3).map((l) => `Pass near ${l}`),
    `Arrive at ${to.name}`,
  ];

  return {
    from: from.name,
    to: to.name,
    distance: formatDistance(distanceM),
    duration: formatDuration(durationS),
    steps,
    fromLat: from.lat,
    fromLng: from.lng,
    toLat: to.lat,
    toLng: to.lng,
    landmarks: landmarks.slice(0, 4),
    mapsUrl: buildMapsDirectionsUrl(from.lat, from.lng, to.lat, to.lng),
  };
}

export type NearbyPlace = {
  name: string;
  type: string;
  distance: string;
  lat: number;
  lng: number;
};

/** Nearby list from OSM-verified campus places */
export const NEARBY_PLACES: NearbyPlace[] = CAMPUS_PLACES.filter(
  (p) => p.id !== "lpu"
).map((p) => ({
  name: p.name,
  type:
    p.category === "facility"
      ? p.id === "library"
        ? "library"
        : "office"
      : p.category === "sports"
        ? "gym"
        : p.category === "food"
          ? "restaurant"
          : p.category,
  distance: formatDistance(
    haversineDistance(LPU_CENTER.lat, LPU_CENTER.lng, p.lat, p.lng)
  ),
  lat: p.lat,
  lng: p.lng,
}));

export function searchNearby(query: string): NearbyPlace[] {
  const q = query.toLowerCase();
  const typeMap: Record<string, string[]> = {
    atm: ["office"],
    restaurant: ["restaurant"],
    food: ["restaurant"],
    hospital: ["hospital"],
    medical: ["hospital"],
    library: ["library"],
    gym: ["gym"],
    sports: ["gym"],
    parking: ["office"],
    bus: ["office"],
  };

  for (const [keyword, types] of Object.entries(typeMap)) {
    if (q.includes(keyword)) {
      return NEARBY_PLACES.filter((p) => types.includes(p.type));
    }
  }

  return NEARBY_PLACES.filter(
    (p) => p.name.toLowerCase().includes(q) || p.type.includes(q)
  );
}

export async function fetchGoogleDirections(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<RouteResult | null> {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&mode=walking&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;

    const leg = route.legs?.[0];
    if (!leg) return null;

    const steps = leg.steps?.map(
      (s: { html_instructions?: string }) =>
        s.html_instructions?.replace(/<[^>]+>/g, "") ?? ""
    );

    return {
      from: leg.start_address ?? "Start",
      to: leg.end_address ?? "Destination",
      distance: leg.distance?.text ?? "",
      duration: leg.duration?.text ?? "",
      steps: steps?.slice(0, 6),
      fromLat,
      fromLng,
      toLat,
      toLng,
      mapsUrl: buildMapsDirectionsUrl(fromLat, fromLng, toLat, toLng),
    };
  } catch {
    return null;
  }
}
