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
};

function FitBounds({
  points,
  route,
}: {
  points: MapPoint[];
  route?: [number, number][];
}) {
  const map = useMap();
  useEffect(() => {
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
  }, [map, points, route]);
  return null;
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
  className,
}: {
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  markers?: MapPoint[];
  routeLine?: Array<{ lat: number; lng: number }>;
  className?: string;
}) {
  const route: [number, number][] | undefined = routeLine?.map((p) => [
    p.lat,
    p.lng,
  ]);

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
        <FitBounds points={markers} route={route} />
        {route && route.length >= 2 && (
          <Polyline
            positions={route}
            pathOptions={{ color: "#ff6a3d", weight: 4, opacity: 0.9 }}
          />
        )}
        {markers.map((m) => (
          <CircleMarker
            key={`${m.label}-${m.lat}`}
            center={[m.lat, m.lng]}
            radius={m.active ? 10 : 7}
            pathOptions={{
              color: m.active ? "#ff6a3d" : "#1a237e",
              fillColor: m.active ? "#ff6a3d" : "#3949ab",
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>
              <span className="text-sm font-medium text-black">{m.label}</span>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
