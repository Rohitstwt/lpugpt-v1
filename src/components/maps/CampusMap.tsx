"use client";

import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { LPU_CENTER } from "@/lib/maps/campus-coordinates";

type MapMarker = {
  lat: number;
  lng: number;
  label: string;
  type?: string;
  active?: boolean;
};

type CampusMapProps = {
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  markers?: MapMarker[];
  routeLine?: Array<{ lat: number; lng: number }>;
  className?: string;
  heightClass?: string;
};

const LeafletMap = dynamic(
  () =>
    import("@/components/maps/LeafletCampusMap").then((m) => m.LeafletCampusMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-bg-elevated text-xs text-text-muted">
        Loading map…
      </div>
    ),
  }
);

/** Free OpenStreetMap campus map (no API key). */
export function CampusMap({
  centerLat = LPU_CENTER.lat,
  centerLng = LPU_CENTER.lng,
  zoom = 15,
  markers = [],
  routeLine,
  className,
  heightClass = "h-56",
}: CampusMapProps) {
  return (
    <Card
      className={`overflow-hidden border-white/8 bg-transparent shadow-none ${className ?? ""}`}
    >
      <div className={`relative w-full ${heightClass}`}>
        <LeafletMap
          centerLat={centerLat}
          centerLng={centerLng}
          zoom={zoom}
          markers={markers}
          routeLine={routeLine}
          className="h-full w-full"
        />
      </div>
    </Card>
  );
}
