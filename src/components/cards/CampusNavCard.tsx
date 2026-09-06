"use client";

import { useState } from "react";
import { LocateFixed, Navigation, Volume2, VolumeX, X } from "lucide-react";
import { CampusMap } from "@/components/maps/CampusMap";
import {
  PlaceSearchDropdown,
  YOUR_LOCATION_ID,
} from "@/components/navigation/PlaceSearchDropdown";
import { TurnByTurnBanner } from "@/components/navigation/TurnByTurnBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLiveNavigation } from "@/hooks/useLiveNavigation";
import { type CampusPlace } from "@/lib/maps/campus-coordinates";
import type { CampusNavCardData } from "@/types/ui-blocks";

export function CampusNavCard({ data }: { data: CampusNavCardData }) {
  const places = data.places as CampusPlace[];
  const [fromId, setFromId] = useState<string | null>(
    data.fromId ?? YOUR_LOCATION_ID
  );
  const [toId, setToId] = useState<string | null>(data.toId ?? null);
  const [navigating, setNavigating] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);

  const from =
    fromId && fromId !== YOUR_LOCATION_ID
      ? places.find((p) => p.id === fromId) ?? null
      : null;
  const to = places.find((p) => p.id === toId) ?? null;

  const {
    active,
    displayPath,
    loadingRoute,
    userLocation,
    locationError,
    navState,
    start,
    stop,
    setLocationError,
  } = useLiveNavigation({
    from,
    to,
    enabled: navigating,
    voiceEnabled: voiceOn,
  });

  function beginNavigation() {
    if (!to) {
      setLocationError("Pick a destination from the dropdown.");
      return;
    }
    setLocationError(null);
    const ok = start();
    if (ok) setNavigating(true);
  }

  function endNavigation() {
    stop();
    setNavigating(false);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  const markers: Array<{
    lat: number;
    lng: number;
    label: string;
    active?: boolean;
    kind?: "place" | "user" | "destination";
  }> = [];

  if (from) {
    markers.push({
      lat: from.lat,
      lng: from.lng,
      label: from.name,
      active: true,
      kind: "place",
    });
  }
  if (to) {
    markers.push({
      lat: to.lat,
      lng: to.lng,
      label: to.name,
      active: true,
      kind: "destination",
    });
  }

  if (userLocation && navigating) {
    markers.push({
      lat: userLocation.lat,
      lng: userLocation.lng,
      label: "You",
      active: true,
      kind: "user",
    });
  }

  const showPreviewRoute =
    !navigating && from && to && (active?.line?.length ?? 0) > 0;

  /* ── Active navigation mode ── */
  if (navigating && to) {
    return (
      <Card className="overflow-hidden border-white/8 bg-transparent shadow-none">
        <CardContent className="space-y-3 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Live navigation
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setVoiceOn((v) => !v)}
                aria-label={voiceOn ? "Mute voice" : "Enable voice"}
              >
                {voiceOn ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={endNavigation}
              >
                <X />
                End
              </Button>
            </div>
          </div>

          {navState ? (
            <TurnByTurnBanner
              nav={navState}
              destination={to.name}
              loading={loadingRoute}
            />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-surface/50 p-4 text-center text-sm text-text-muted">
              Getting your position…
            </div>
          )}

          {locationError && (
            <p className="text-center text-xs text-red-300">{locationError}</p>
          )}

          <CampusMap
            markers={markers}
            routeLine={displayPath}
            followUser={userLocation}
            heightClass="h-80"
          />

          {userLocation && (
            <p className="text-center text-[11px] text-text-muted">
              GPS ±{Math.round(userLocation.accuracy)} m · route updates as you
              walk
            </p>
          )}

          {navState?.arrived && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
              <p className="text-lg font-semibold text-emerald-400">
                You&apos;ve arrived!
              </p>
              <p className="mt-1 text-sm text-text-muted">{to.name}</p>
              <Button
                type="button"
                className="mt-3"
                variant="secondary"
                onClick={endNavigation}
              >
                Done
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  /* ── Plan mode with searchable dropdowns ── */
  return (
    <Card className="overflow-hidden border-white/8 bg-transparent shadow-none">
      <CardHeader className="space-y-3 px-4 py-3 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Navigation className="h-3.5 w-3.5 text-text-muted" />
            Campus navigation
          </CardTitle>
          <span className="text-[10px] text-text-muted">
            {places.length} places
          </span>
        </div>

        <div className="space-y-2 rounded-2xl border border-white/8 bg-surface/40 p-3">
          <PlaceSearchDropdown
            label="From"
            places={places}
            value={fromId}
            onChange={(id) => {
              setFromId(id);
              if (id && id !== YOUR_LOCATION_ID && id === toId) setToId(null);
            }}
            allowYourLocation
            placeholder="Your location"
          />

          <PlaceSearchDropdown
            label="To"
            places={places}
            value={toId}
            onChange={(id) => {
              setToId(id);
              if (id && id === fromId) setFromId(YOUR_LOCATION_ID);
            }}
            placeholder="Choose destination"
            highlight
          />

          <Button
            type="button"
            size="lg"
            className="mt-1 w-full"
            disabled={!to}
            onClick={beginNavigation}
          >
            <LocateFixed />
            Start navigation
          </Button>
        </div>

        {locationError && (
          <p className="text-xs text-red-300">{locationError}</p>
        )}

        {active && to && (showPreviewRoute || fromId === YOUR_LOCATION_ID) && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{active.distance}</Badge>
            <Badge variant="secondary">{active.duration}</Badge>
            {fromId === YOUR_LOCATION_ID && !from && (
              <span className="text-[11px] text-text-muted">
                Route from your GPS when you start
              </span>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="px-3 pb-3 pt-0">
        <CampusMap
          markers={markers}
          routeLine={showPreviewRoute ? active?.line : undefined}
          zoom={15}
          heightClass="h-56"
        />
      </CardContent>
    </Card>
  );
}
