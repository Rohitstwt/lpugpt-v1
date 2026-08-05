"use client";

import { motion } from "framer-motion";
import { Calendar, Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EventCardData } from "@/types/ui-blocks";

export function EventCard({ data }: { data: EventCardData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card className="border-l-4 border-l-orange">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            {data.category && <Badge>{data.category}</Badge>}
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <Calendar className="h-3.5 w-3.5" />
              {data.date}
            </span>
          </div>
          <CardTitle className="mt-2">{data.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.time && (
            <p className="flex items-center gap-2 text-sm text-text-muted">
              <Clock className="h-3.5 w-3.5" />
              {data.time}
            </p>
          )}
          {data.location && (
            <p className="flex items-center gap-2 text-sm text-text-muted">
              <MapPin className="h-3.5 w-3.5" />
              {data.location}
            </p>
          )}
          {data.description && (
            <p className="text-sm leading-relaxed text-text-muted">{data.description}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
