"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, LocateFixed, Navigation, Search, Square } from "lucide-react";
import { CampusMap } from "@/components/maps/CampusMap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildMapsDirectionsUrl,
  estimateWalkTime,
  haversineDistance,
  type CampusPlace,
  type PlaceCategory,
} from "@/lib/maps/campus-coordinates";
import { formatDistance, formatDuration } from "@/lib/utils";
import type { CampusNavCardData } from "@/types/ui-blocks";

type LiveRoute = {
  distance: string;
  duration: string;
  mapsUrl: string;
  line: Array<{ lat: number; lng: number }>;
  provider: "osrm" | "estimate";
  steps?: Array<{ instruction: string; lat?: number; lng?: number }>;
};

type UserLocation = {
  lat: number;
  lng: number;
  accuracy: number;
};

const FILTERS: Array<{ id: "all" | PlaceCategory; label: string }> = [
  { id: "all", label: "All" },
  { id: "block", label: "Blocks" },
  { id: "institute", label: "Schools" },
  { id: "facility", label: "Facilities" },
  { id: "food", label: "Food" },
  { id: "hostel", label: "Hostels" },
  { id: "sports", label: "Sports" },
  { id: "bank", label: "Banks" },
  { id: "medical", label: "Medical" },
  { id: "shop", label: "Shops" },
  { id: "landmark", label: "Gates" },
];

export function CampusNavCard({ data }: { data: CampusNavCardData }) {
  const places = data.places as CampusPlace[];
  const [fromId, setFromId] = useState<string | null>(data.fromId ?? null);
  const [toId, setToId] = useState<string | null>(data.toId ?? null);
  const [picking, setPicking] = useState<"from" | "to">("from");
  const [filter, setFilter] = useState<"all" | PlaceCategory>("all");
  const [q, setQ] = useState("");
  const [route, setRoute] = useState<LiveRoute | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [liveNavigation, setLiveNavigation] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const lastRouteRequest = useRef<{ lat: number; lng: number; at: number } | null>(null);

  const from = places.find((p) => p.id === fromId) ?? null;
  const to = places.find((p) => p.id === toId) ?? null;

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    return places.filter((p) => {
      if (filter !== "all" && p.category !== filter) return false;
      if (!query) return true;
      return (
        p.name.toLowerCase().includes(query) ||
        p.id.includes(query) ||
        (p.description || "").toLowerCase().includes(query)
      );
    });
  }, [places, filter, q]);

  const routeOrigin = liveNavigation && userLocation ? userLocation : from;

  const fallbackRoute = useMemo<LiveRoute | null>(() => {
    if (!routeOrigin || !to) return null;
    const meters = haversineDistance(routeOrigin.lat, routeOrigin.lng, to.lat, to.lng);
    return {
      distance: formatDistance(meters),
      duration: formatDuration(estimateWalkTime(meters)),
      mapsUrl: buildMapsDirectionsUrl(routeOrigin.lat, routeOrigin.lng, to.lat, to.lng),
      line: [
        { lat: routeOrigin.lat, lng: routeOrigin.lng },
        { lat: to.lat, lng: to.lng },
      ],
      provider: "estimate" as const,
    };
  }, [routeOrigin, to]);

  useEffect(() => {
    if (!routeOrigin || !to) {
      return;
    }

    const now = Date.now();
    const previous = lastRouteRequest.current;
    if (
      previous &&
      now - previous.at < 12_000 &&
      haversineDistance(previous.lat, previous.lng, routeOrigin.lat, routeOrigin.lng) < 12
    ) {
      return;
    }

    let cancelled = false;
    setLoadingRoute(true);
    lastRouteRequest.current = { lat: routeOrigin.lat, lng: routeOrigin.lng, at: now };
    const origin = `${routeOrigin.lat},${routeOrigin.lng}`;
    const destination = `${to.lat},${to.lng}`;

    fetch(
      `/api/maps/directions?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`
    )
      .then(async (res) => {
        if (!res.ok) throw new Error("directions failed");
        return res.json();
      })
      .then((payload) => {
        if (cancelled) return;
        setRoute({
          distance: payload.distance,
          duration: payload.duration,
          mapsUrl: payload.mapsUrl,
          line: payload.path,
          provider: "osrm",
          steps: payload.steps,
        });
      })
      .catch(() => {
        if (!cancelled) setRoute(fallbackRoute);
      })
      .finally(() => {
        if (!cancelled) setLoadingRoute(false);
      });

    return () => {
      cancelled = true;
    };
  }, [routeOrigin, to, fallbackRoute]);

  useEffect(() => {
    return () => {
      if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current);
    };
  }, []);

  function startLiveNavigation() {
    if (!("geolocation" in navigator)) {
      setLocationError("Live location is not available in this browser.");
      return;
    }
    setLocationError(null);
    setLiveNavigation(true);
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Allow location access to navigate."
            : "Couldn’t get a GPS position. Move outdoors and try again."
        );
        setLiveNavigation(false);
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 }
    );
  }

  function stopLiveNavigation() {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setLiveNavigation(false);
    setUserLocation(null);
    lastRouteRequest.current = null;
  }

  function pick(id: string) {
    if (picking === "from") {
      setFromId(id);
      setPicking("to");
      if (id === toId) setToId(null);
    } else {
      setToId(id);
      if (id === fromId) setFromId(null);
    }
  }

  // Show filtered places + always keep from/to visible on map
  const mapPlaces = useMemo(() => {
    const ids = new Set(visible.map((p) => p.id));
    const extra = places.filter(
      (p) => (p.id === fromId || p.id === toId) && !ids.has(p.id)
    );
    return [...visible, ...extra];
  }, [visible, places, fromId, toId]);

  const markers = mapPlaces.map((p) => ({
    lat: p.lat,
    lng: p.lng,
    label: p.name,
    active: p.id === fromId || p.id === toId,
  }));

  if (userLocation) {
    markers.push({
      lat: userLocation.lat,
      lng: userLocation.lng,
      label: "You are here",
      active: true,
    });
  }

  const active = route ?? fallbackRoute;
  const remainingMeters =
    userLocation && to
      ? haversineDistance(userLocation.lat, userLocation.lng, to.lat, to.lng)
      : null;
  const nextStep =
    active?.steps?.find(
      (step) =>
        step.lat === undefined ||
        step.lng === undefined ||
        !userLocation ||
        haversineDistance(userLocation.lat, userLocation.lng, step.lat, step.lng) > 18
    ) ?? active?.steps?.[0];

  return (
    <Card className="border-white/8 bg-transparent shadow-none overflow-hidden">
      <CardHeader className="space-y-2 px-4 py-3 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Navigation className="h-3.5 w-3.5 text-text-muted" />
            Campus map
          </CardTitle>
          <span className="text-[10px] text-text-muted">
            {places.length} places · OSM + guide
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => {
              stopLiveNavigation();
              setPicking("from");
            }}
            className={`rounded-md px-2 py-1 ${
              picking === "from" ? "bg-white/10" : "text-text-muted"
            }`}
          >
            From: {liveNavigation ? "Your location" : from?.name ?? "pick"}
          </button>
          <ArrowRight className="h-3 w-3 text-text-muted" />
          <button
            type="button"
            onClick={() => setPicking("to")}
            className={`rounded-md px-2 py-1 ${
              picking === "to" ? "bg-white/10" : "text-text-muted"
            }`}
          >
            To: {to?.name ?? "pick"}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={liveNavigation ? "secondary" : "default"}
            onClick={liveNavigation ? stopLiveNavigation : startLiveNavigation}
          >
            {liveNavigation ? <Square /> : <LocateFixed />}
            {liveNavigation ? "Stop live navigation" : "Use my location"}
          </Button>
          {liveNavigation && !userLocation && (
            <span className="text-[11px] text-text-muted">Finding your GPS location…</span>
          )}
          {userLocation && (
            <span className="text-[11px] text-text-muted">
              GPS accuracy ±{Math.round(userLocation.accuracy)} m
            </span>
          )}
        </div>
        {locationError && <p className="text-xs text-red-300">{locationError}</p>}
        {active && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{active.distance}</Badge>
            <Badge variant="secondary">
              {loadingRoute ? "…" : active.duration} walk
            </Badge>
            <a
              href={active.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-orange hover:underline"
            >
              Open in Google Maps
            </a>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3 pt-0">
        <CampusMap
          markers={markers}
          routeLine={active?.line}
          zoom={15}
          heightClass="h-72"
        />

        {liveNavigation && to && (
          <div className="rounded-xl border border-orange/25 bg-orange/10 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-orange">
              Live guidance to {to.name}
            </p>
            <p className="mt-1 text-sm font-medium text-text">
              {nextStep?.instruction ?? "Follow the highlighted route towards your destination."}
            </p>
            {remainingMeters !== null && (
              <p className="mt-1 text-xs text-text-muted">
                About {formatDistance(remainingMeters)} straight-line distance remaining. Route refreshes as you move.
              </p>
            )}
          </div>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search blocks, food, hostels…"
            className="h-8 pl-8 text-xs"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-2 py-0.5 text-[11px] transition-colors ${
                filter === f.id
                  ? "bg-white/15 text-text"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="max-h-40 overflow-y-auto">
          <div className="flex flex-wrap gap-1.5">
            {visible.slice(0, 80).map((p) => {
              const selected = p.id === fromId || p.id === toId;
              return (
                <Button
                  key={p.id}
                  type="button"
                  size="sm"
                  variant={selected ? "default" : "ghost"}
                  className="h-7 px-2.5 text-xs"
                  onClick={() => pick(p.id)}
                >
                  {p.name}
                </Button>
              );
            })}
            {!visible.length && (
              <p className="text-xs text-text-muted">No matches.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
