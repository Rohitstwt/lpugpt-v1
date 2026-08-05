import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Walking directions via OSRM (open-source routing machine).
 * Public demo server — free, no API key. Fine for campus demos.
 * https://project-osrm.org/
 */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.searchParams.get("origin"); // lat,lng
  const destination = req.nextUrl.searchParams.get("destination");
  if (!origin || !destination) {
    return NextResponse.json(
      { error: "origin and destination required as lat,lng" },
      { status: 400 }
    );
  }

  const [oLat, oLng] = origin.split(",").map(Number);
  const [dLat, dLng] = destination.split(",").map(Number);
  if (![oLat, oLng, dLat, dLng].every((n) => Number.isFinite(n))) {
    return NextResponse.json({ error: "invalid coordinates" }, { status: 400 });
  }

  // OSRM expects lon,lat
  const url =
    `https://router.project-osrm.org/route/v1/walking/` +
    `${oLng},${oLat};${dLng},${dLat}` +
    `?overview=full&geometries=geojson&steps=true`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "LPUGPT/1.0 (campus-navigation-demo)" },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "OSRM request failed" }, { status: 502 });
    }
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]) {
      return NextResponse.json(
        { error: data.code || "NO_ROUTE" },
        { status: 404 }
      );
    }

    const route = data.routes[0];
    const leg = route.legs?.[0];
    const coords: Array<[number, number]> = route.geometry?.coordinates || [];
    // geojson is [lng, lat] → our path is {lat,lng}
    const path = coords.map(([lng, lat]) => ({ lat, lng }));

    const steps =
      leg?.steps
        ?.map((s: { manuver?: { instruction?: string }; name?: string }) => {
          const instr =
            (s as { maneuver?: { instruction?: string } }).maneuver
              ?.instruction || s.name;
          return instr;
        })
        .filter(Boolean)
        .slice(0, 8) ?? [];

    const distanceM = route.distance ?? 0;
    const durationS = route.duration ?? 0;

    return NextResponse.json({
      provider: "osrm",
      distance:
        distanceM >= 1000
          ? `${(distanceM / 1000).toFixed(1)} km`
          : `${Math.round(distanceM)} m`,
      duration:
        durationS >= 60
          ? `${Math.round(durationS / 60)} min`
          : `${Math.round(durationS)} sec`,
      distanceMeters: distanceM,
      durationSeconds: durationS,
      steps,
      path,
      mapsUrl: `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${oLat}%2C${oLng}%3B${dLat}%2C${dLng}`,
    });
  } catch (err) {
    console.error("OSRM directions failed", err);
    return NextResponse.json({ error: "Directions unavailable" }, { status: 502 });
  }
}
