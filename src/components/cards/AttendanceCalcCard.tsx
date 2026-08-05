"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AttendanceCalcCardData } from "@/types/ui-blocks";

export function AttendanceCalcCard({
  data,
}: {
  data: AttendanceCalcCardData;
}) {
  const min = data.minPercent ?? 75;

  return (
    <Card className="border-white/8 bg-transparent shadow-none">
      <CardHeader className="px-4 py-3 pb-1">
        <CardTitle className="text-sm font-medium">
          Attendance · ≥{min}%
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <ul className="divide-y divide-white/5">
          {data.rows.map((row) => (
            <li
              key={row.courseCode}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm">{row.courseCode}</p>
                <p className="text-xs text-text-muted">
                  {row.present}/{row.total}
                  {row.status === "eligible"
                    ? ` · miss ${row.canMiss}`
                    : ` · need +${row.needAttend}`}
                </p>
              </div>
              <Badge
                variant={
                  row.status === "eligible"
                    ? "success"
                    : row.status === "warning"
                      ? "warning"
                      : "destructive"
                }
                className="shrink-0 tabular-nums"
              >
                {row.percentage}%
              </Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
