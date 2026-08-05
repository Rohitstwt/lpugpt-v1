"use client";

import { motion } from "framer-motion";
import { AlertCircle, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NoticeCardData } from "@/types/ui-blocks";

const priorityVariant = {
  low: "secondary" as const,
  normal: "secondary" as const,
  high: "warning" as const,
  urgent: "destructive" as const,
};

export function NoticeCard({ data }: { data: NoticeCardData }) {
  const variant = priorityVariant[data.priority ?? "normal"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            {data.priority === "urgent" ? (
              <AlertCircle className="h-4 w-4 text-red-400" />
            ) : (
              <Bell className="h-4 w-4 text-orange" />
            )}
            {data.category && <Badge variant={variant}>{data.category}</Badge>}
            {data.date && (
              <span className="text-xs text-text-muted">{data.date}</span>
            )}
          </div>
          <CardTitle className="mt-2 text-base">{data.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-text-muted">{data.body}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
