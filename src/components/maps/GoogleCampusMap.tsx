"use client";

import { useEffect, useMemo } from "react";
import {
  APIProvider,
  Map,
  Marker,
  Polyline,
  useMap,
} from "@vis.gl/react-google-maps";
import { Card } from "@/components/ui/card";
import { LPU_CENTER } from "@/lib/maps/campus-coordinates";

export type MapPoint = {
  lat: number;
  lng: number;
  label: string;
  active?: boolean;
};

function FitBounds({
  points,
  route,
}: {
  points: MapPoint[];
  route?: Array<{ lat: number; lng: number }>;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || typeof google === "undefined") return;
    const path = [
      ...points.map((p) => ({ lat: p.lat, lng: p.lng })),
      ...(route || []),
    ];
    if (path.length === 0) return;
    if (path.length === 1) {
      map.setCenter(path[0]);
      map.setZoom(17);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    path.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 48);
  }, [map, points, route]);
  return null;
}

function GoogleMapInner({
  centerLat,
  centerLng,
  zoom,
  markers,
  routeLine,
}: {
  centerLat: number;
  centerLng: number;
  zoom: number;
  markers: MapPoint[];
  routeLine?: Array<{ lat: number; lng: number }>;
}) {
  const path = useMemo(
    () => routeLine?.map((p) => ({ lat: p.lat, lng: p.lng })) ?? [],
    [routeLine]
  );

  return (
    <Map
      defaultCenter={{ lat: centerLat, lng: centerLng }}
      defaultZoom={zoom}
      gestureHandling="greedy"
      disableDefaultUI={false}
      mapTypeControl={false}
      streetViewControl={false}
      fullscreenControl={false}
      className="h-full w-full"
    >
      <FitBounds points={markers} route={routeLine} />
      {path.length >= 2 && (
        <Polyline
          path={path}
          strokeColor="#ff6a3d"
          strokeOpacity={0.95}
          strokeWeight={4}
        />
      )}
      {markers.map((m) => (
        <Marker
          key={`${m.label}-${m.lat}-${m.lng}`}
          position={{ lat: m.lat, lng: m.lng }}
          title={m.label}
        />
      ))}
    </Map>
  );
}

export function GoogleCampusMap({
  apiKey,
  centerLat = LPU_CENTER.lat,
  centerLng = LPU_CENTER.lng,
  zoom = 15,
  markers = [],
  routeLine,
  className,
}: {
  apiKey: string;
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  markers?: MapPoint[];
  routeLine?: Array<{ lat: number; lng: number }>;
  className?: string;
}) {
  return (
    <div className={className ?? "h-full w-full"}>
      <APIProvider apiKey={apiKey}>
        <GoogleMapInner
          centerLat={centerLat}
          centerLng={centerLng}
          zoom={zoom}
          markers={markers}
          routeLine={routeLine}
        />
      </APIProvider>
    </div>
  );
}

export function GoogleMapsMissing({ className }: { className?: string }) {
  return (
    <Card
      className={`flex h-full items-center justify-center border-white/8 bg-transparent shadow-none ${className ?? ""}`}
    >
      <div className="max-w-sm space-y-2 p-6 text-center">
        <p className="text-sm font-medium">Google Maps required</p>
        <p className="text-xs text-text-muted leading-relaxed">
          Add a Maps JavaScript API key so campus navigation uses Google’s
          basemap (not OpenStreetMap).
        </p>
        <p className="rounded-md bg-bg-elevated px-2 py-1.5 font-mono text-[11px] text-text-muted">
          NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=…
        </p>
        <a
          href="https://console.cloud.google.com/google/maps-apis"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs text-orange hover:underline"
        >
          Get a key from Google Cloud →
        </a>
      </div>
    </Card>
  );
}
