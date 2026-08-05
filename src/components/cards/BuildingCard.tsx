"use client";

import { motion } from "framer-motion";
import { Building2, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BuildingCardData } from "@/types/ui-blocks";

export function BuildingCard({ data }: { data: BuildingCardData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange/15">
              <Building2 className="h-6 w-6 text-orange" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle>{data.name}</CardTitle>
              {data.block && (
                <p className="mt-1 flex items-center gap-1 text-sm text-text-muted">
                  <MapPin className="h-3.5 w-3.5" />
                  {data.block}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        {data.description && (
          <CardContent className="space-y-3">
            <p className="text-sm leading-relaxed text-text-muted">{data.description}</p>
            {data.facilities && data.facilities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.facilities.map((f) => (
                  <Badge key={f} variant="secondary">{f}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
}
