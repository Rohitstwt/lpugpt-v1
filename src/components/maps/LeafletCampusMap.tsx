"use client";

import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { LPU_CENTER } from "@/lib/maps/campus-coordinates";

export type MapPoint = {
  lat: number;
  lng: number;
  label: string;
  active?: boolean;
  kind?: "place" | "user" | "destination";
};

function FitBounds({
  points,
  route,
  followUser,
}: {
  points: MapPoint[];
  route?: [number, number][];
  followUser?: { lat: number; lng: number };
}) {
  const map = useMap();
  useEffect(() => {
    if (followUser) {
      map.setView([followUser.lat, followUser.lng], 18, { animate: true });
      return;
    }
    const coords: [number, number][] = [
      ...points.map((p) => [p.lat, p.lng] as [number, number]),
      ...(route || []),
    ];
    if (coords.length >= 2) {
      map.fitBounds(coords, { padding: [36, 36], maxZoom: 17 });
    } else if (coords.length === 1) {
      map.setView(coords[0], 17);
    } else {
      map.setView([LPU_CENTER.lat, LPU_CENTER.lng], 15);
    }
  }, [map, points, route, followUser]);
  return null;
}

function UserPulse({ lat, lng }: { lat: number; lng: number }) {
  return (
    <>
      <CircleMarker
        center={[lat, lng]}
        radius={22}
        pathOptions={{
          color: "#ff6a00",
          fillColor: "#ff6a00",
          fillOpacity: 0.12,
          weight: 1,
        }}
      />
      <CircleMarker
        center={[lat, lng]}
        radius={8}
        pathOptions={{
          color: "#fff",
          fillColor: "#ff6a00",
          fillOpacity: 1,
          weight: 3,
        }}
      />
    </>
  );
}

/**
 * Free stack: OpenStreetMap raster tiles + Leaflet.
 * Attribution required by OSM tile usage policy.
 */
export function LeafletCampusMap({
  centerLat = LPU_CENTER.lat,
  centerLng = LPU_CENTER.lng,
  zoom = 15,
  markers = [],
  routeLine,
  followUser,
  className,
}: {
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  markers?: MapPoint[];
  routeLine?: Array<{ lat: number; lng: number }>;
  followUser?: { lat: number; lng: number } | null;
  className?: string;
}) {
  const route: [number, number][] | undefined = routeLine?.map((p) => [
    p.lat,
    p.lng,
  ]);

  const placeMarkers = markers.filter((m) => m.kind !== "user");
  const userMarker = markers.find((m) => m.kind === "user");

  return (
    <div className={className ?? "h-full w-full"}>
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={zoom}
        className="h-full w-full rounded-lg z-0"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <FitBounds
          points={placeMarkers}
          route={route}
          followUser={followUser ?? undefined}
        />
        {route && route.length >= 2 && (
          <>
            <Polyline
              positions={route}
              pathOptions={{
                color: "#ff6a3d",
                weight: 6,
                opacity: 0.95,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            <Polyline
              positions={route}
              pathOptions={{
                color: "#ffb088",
                weight: 2,
                opacity: 0.6,
                dashArray: "6 8",
              }}
            />
          </>
        )}
        {placeMarkers.map((m) => (
          <CircleMarker
            key={`${m.label}-${m.lat}`}
            center={[m.lat, m.lng]}
            radius={m.kind === "destination" ? 11 : m.active ? 10 : 7}
            pathOptions={{
              color:
                m.kind === "destination"
                  ? "#22c55e"
                  : m.active
                    ? "#ff6a3d"
                    : "#1a237e",
              fillColor:
                m.kind === "destination"
                  ? "#22c55e"
                  : m.active
                    ? "#ff6a3d"
                    : "#3949ab",
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>
              <span className="text-sm font-medium text-black">{m.label}</span>
            </Popup>
          </CircleMarker>
        ))}
        {userMarker && (
          <UserPulse lat={userMarker.lat} lng={userMarker.lng} />
        )}
      </MapContainer>
    </div>
  );
}
