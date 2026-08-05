"use client";

import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CampusMap } from "@/components/maps/CampusMap";

type NearbyPlacesData = {
  query: string;
  places: Array<{
    name: string;
    type?: string;
    distance?: string;
    lat?: number;
    lng?: number;
  }>;
};

export function NearbyPlacesCard({ data }: { data: NearbyPlacesData }) {
  const markers = data.places
    .filter((p) => p.lat && p.lng)
    .map((p) => ({
      lat: p.lat!,
      lng: p.lng!,
      label: p.name,
      type: p.type,
    }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-4"
    >
      {markers.length > 0 && (
        <CampusMap
          centerLat={markers[0].lat}
          centerLng={markers[0].lng}
          markers={markers}
        />
      )}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Nearby: {data.query}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.places.map((place) => (
            <div
              key={place.name}
              className="flex items-center justify-between rounded-xl bg-bg-elevated px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-orange shrink-0" />
                <div>
                  <p className="font-medium text-sm">{place.name}</p>
                  {place.type && (
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      {place.type}
                    </Badge>
                  )}
                </div>
              </div>
              {place.distance && (
                <span className="text-sm text-text-muted">{place.distance}</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
