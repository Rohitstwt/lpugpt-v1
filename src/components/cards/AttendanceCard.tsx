"use client";

import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import type { AttendanceCardData } from "@/types/ui-blocks";

export function AttendanceCard({ data }: { data: AttendanceCardData }) {
  return (
    <Card className="border-white/8 bg-transparent shadow-none">
      <CardContent className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <p className="truncate text-sm">{data.courseCode ?? "Course"}</p>
            <span className="text-xs tabular-nums text-text-muted">
              {data.percentage}%
            </span>
          </div>
          <Progress value={data.percentage} className="h-1" />
        </div>
      </CardContent>
    </Card>
  );
}
