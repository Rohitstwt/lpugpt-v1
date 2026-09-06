"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildMapsDirectionsUrl,
  estimateWalkTime,
  haversineDistance,
  type CampusPlace,
} from "@/lib/maps/campus-coordinates";
import {
  computeNavigationState,
  parseOsrmStep,
  remainingPath,
  snapToRoute,
  type NavigationSnapshot,
  type RoutePath,
  type RouteStep,
} from "@/lib/maps/navigation-engine";
import { formatDistance, formatDuration } from "@/lib/utils";

export type LiveRoute = {
  distance: string;
  duration: string;
  mapsUrl: string;
  line: RoutePath;
  provider: "osrm" | "estimate";
  steps: RouteStep[];
  totalDistanceM: number;
  totalDurationS: number;
};

export type UserLocation = {
  lat: number;
  lng: number;
  accuracy: number;
  heading?: number | null;
};

const ROUTE_REFRESH_MIN_M = 25;
const ROUTE_REFRESH_MIN_MS = 15_000;

export function useLiveNavigation({
  from,
  to,
  enabled,
  voiceEnabled = true,
}: {
  from: CampusPlace | null;
  to: CampusPlace | null;
  enabled: boolean;
  voiceEnabled?: boolean;
}) {
  const [route, setRoute] = useState<LiveRoute | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const lastRouteRequest = useRef<{
    lat: number;
    lng: number;
    at: number;
  } | null>(null);
  const spokenRef = useRef<string>("");

  const routeOrigin = enabled && userLocation ? userLocation : from;

  const fallbackRoute = useMemo<LiveRoute | null>(() => {
    if (!routeOrigin || !to) return null;
    const meters = haversineDistance(
      routeOrigin.lat,
      routeOrigin.lng,
      to.lat,
      to.lng
    );
    return {
      distance: formatDistance(meters),
      duration: formatDuration(estimateWalkTime(meters)),
      mapsUrl: buildMapsDirectionsUrl(
        routeOrigin.lat,
        routeOrigin.lng,
        to.lat,
        to.lng
      ),
      line: [
        { lat: routeOrigin.lat, lng: routeOrigin.lng },
        { lat: to.lat, lng: to.lng },
      ],
      provider: "estimate",
      steps: [],
      totalDistanceM: meters,
      totalDurationS: estimateWalkTime(meters),
    };
  }, [routeOrigin, to]);

  const fetchRoute = useCallback(
    async (origin: { lat: number; lng: number }, dest: CampusPlace) => {
      const res = await fetch(
        `/api/maps/directions?origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}`
      );
      if (!res.ok) throw new Error("directions failed");
      const payload = await res.json();
      const steps = (payload.steps ?? [])
        .map(parseOsrmStep)
        .filter(Boolean) as RouteStep[];

      return {
        distance: payload.distance,
        duration: payload.duration,
        mapsUrl: payload.mapsUrl,
        line: payload.path as RoutePath,
        provider: "osrm" as const,
        steps,
        totalDistanceM: payload.distanceMeters ?? 0,
        totalDurationS: payload.durationSeconds ?? 0,
      };
    },
    []
  );

  useEffect(() => {
    if (!routeOrigin || !to) {
      setRoute(null);
      return;
    }

    const now = Date.now();
    const prev = lastRouteRequest.current;
    if (
      prev &&
      now - prev.at < ROUTE_REFRESH_MIN_MS &&
      haversineDistance(prev.lat, prev.lng, routeOrigin.lat, routeOrigin.lng) <
        ROUTE_REFRESH_MIN_M
    ) {
      return;
    }

    let cancelled = false;
    setLoadingRoute(true);
    lastRouteRequest.current = {
      lat: routeOrigin.lat,
      lng: routeOrigin.lng,
      at: now,
    };

    fetchRoute(routeOrigin, to)
      .then((r) => {
        if (!cancelled) setRoute(r);
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
  }, [routeOrigin, to, fallbackRoute, fetchRoute]);

  const start = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocationError("Location is not available in this browser.");
      return false;
    }
    setLocationError(null);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
        });
      },
      (err) => {
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? "Allow location access to navigate in real time."
            : "Couldn't get GPS. Try moving outdoors."
        );
      },
      { enableHighAccuracy: true, maximumAge: 3_000, timeout: 12_000 }
    );
    return true;
  }, []);

  const stop = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setUserLocation(null);
    lastRouteRequest.current = null;
    spokenRef.current = "";
  }, []);

  useEffect(() => () => stop(), [stop]);

  const active = route ?? fallbackRoute;

  const navState = useMemo<NavigationSnapshot | null>(() => {
    if (!enabled || !userLocation || !to || !active?.line.length) return null;
    return computeNavigationState({
      userLat: userLocation.lat,
      userLng: userLocation.lng,
      destLat: to.lat,
      destLng: to.lng,
      steps: active.steps,
      path: active.line,
      totalDistanceM: active.totalDistanceM,
      totalDurationS: active.totalDurationS,
    });
  }, [enabled, userLocation, to, active]);

  const displayPath = useMemo(() => {
    if (!enabled || !userLocation || !active?.line.length) {
      return active?.line;
    }
    const snap = snapToRoute(
      userLocation.lat,
      userLocation.lng,
      active.line
    );
    return remainingPath(active.line, snap.traveledM);
  }, [enabled, userLocation, active?.line]);

  // Optional voice cue when instruction changes
  useEffect(() => {
    if (!navState?.voiceText || !enabled || !voiceEnabled) return;
    if (spokenRef.current === navState.voiceText) return;
    spokenRef.current = navState.voiceText;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utter = new SpeechSynthesisUtterance(navState.voiceText);
      utter.rate = 1.05;
      utter.volume = 0.85;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    }
  }, [navState?.voiceText, enabled, voiceEnabled]);

  return {
    active,
    displayPath,
    loadingRoute,
    userLocation,
    locationError,
    navState,
    start,
    stop,
    setLocationError,
  };
}
