"use client";

import { motion } from "framer-motion";
import { Home, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { HostelCardData } from "@/types/ui-blocks";

export function HostelCard({ data }: { data: HostelCardData }) {
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
              <Home className="h-5 w-5 text-orange" />
            </div>
            <div>
              <CardTitle>{data.name}</CardTitle>
              {data.type && (
                <p className="text-sm text-text-muted">{data.type}</p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.block && <Badge variant="secondary">{data.block}</Badge>}
          {data.warden && (
            <p className="flex items-center gap-2 text-sm text-text-muted">
              <User className="h-3.5 w-3.5" />
              Warden: {data.warden}
            </p>
          )}
          {data.description && (
            <p className="text-sm text-text-muted">{data.description}</p>
          )}
          {data.facilities && data.facilities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.facilities.map((f) => (
                <Badge key={f} variant="outline">{f}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
