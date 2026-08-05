"use client";

import { motion } from "framer-motion";
import { GraduationCap, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FacultyCardData } from "@/types/ui-blocks";

export function FacultyCard({ data }: { data: FacultyCardData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange/15">
              <GraduationCap className="h-6 w-6 text-orange" />
            </div>
            <div>
              <CardTitle>{data.name}</CardTitle>
              {data.designation && (
                <p className="mt-1 text-sm text-text-muted">{data.designation}</p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.department && (
            <Badge variant="secondary">{data.department}</Badge>
          )}
          {data.specialization && (
            <p className="text-sm text-text-muted">{data.specialization}</p>
          )}
          {data.email && (
            <a
              href={`mailto:${data.email}`}
              className="flex items-center gap-2 text-sm text-orange hover:underline"
            >
              <Mail className="h-3.5 w-3.5" />
              {data.email}
            </a>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
