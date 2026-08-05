"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Clock,
  Footprints,
  MapPin,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RouteCardData } from "@/types/ui-blocks";

export function RouteCard({ data }: { data: RouteCardData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Card className="overflow-hidden border-orange/20 bg-gradient-to-br from-surface to-bg-elevated">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Badge variant="default">Route</Badge>
            <Badge variant="secondary" className="gap-1">
              <Footprints className="h-3 w-3" />
              Walking
            </Badge>
          </div>
          <CardTitle className="mt-2 flex items-center gap-2 text-xl">
            <MapPin className="h-5 w-5 text-orange shrink-0" />
            <span>{data.from}</span>
            <ArrowRight className="h-4 w-4 text-text-muted shrink-0" />
            <span>{data.to}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex items-center gap-2 rounded-xl bg-bg-elevated px-4 py-3">
              <Footprints className="h-4 w-4 text-orange" />
              <div>
                <p className="text-xs text-text-muted">Distance</p>
                <p className="font-semibold">{data.distance}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-bg-elevated px-4 py-3">
              <Clock className="h-4 w-4 text-orange" />
              <div>
                <p className="text-xs text-text-muted">Walking time</p>
                <p className="font-semibold">{data.duration}</p>
              </div>
            </div>
          </div>

          {data.steps && data.steps.length > 0 && (
            <ol className="space-y-2">
              {data.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-text-muted">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange/15 text-xs font-medium text-orange">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          )}

          {data.landmarks && data.landmarks.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
                Nearby landmarks
              </p>
              <div className="flex flex-wrap gap-2">
                {data.landmarks.map((l) => (
                  <Badge key={l} variant="outline">{l}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        {data.mapsUrl && (
          <CardFooter>
            <Button asChild className="w-full gap-2">
              <a href={data.mapsUrl} target="_blank" rel="noopener noreferrer">
                <Navigation className="h-4 w-4" />
                Open in Google Maps
              </a>
            </Button>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
}
