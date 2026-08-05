"use client";

import { motion } from "framer-motion";
import { BookOpen, Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LibraryCardData } from "@/types/ui-blocks";

export function LibraryCard({ data }: { data: LibraryCardData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange/15">
              <BookOpen className="h-5 w-5 text-orange" />
            </div>
            <CardTitle>{data.name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.hours && (
            <p className="flex items-center gap-2 text-sm text-text-muted">
              <Clock className="h-3.5 w-3.5" />
              {data.hours}
            </p>
          )}
          {data.location && (
            <p className="flex items-center gap-2 text-sm text-text-muted">
              <MapPin className="h-3.5 w-3.5" />
              {data.location}
            </p>
          )}
          {data.description && (
            <p className="text-sm text-text-muted">{data.description}</p>
          )}
          {data.services && data.services.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {data.services.map((s) => (
                <Badge key={s} variant="secondary">{s}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
