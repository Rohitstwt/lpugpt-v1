"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GradesCardData } from "@/types/ui-blocks";

export function GradesCard({ data }: { data: GradesCardData }) {
  return (
    <Card className="border-white/8 bg-transparent shadow-none">
      <CardHeader className="flex-row items-center justify-between space-y-0 px-4 py-3 pb-1">
        <CardTitle className="text-sm font-medium">
          {data.term || "Results"}
        </CardTitle>
        {data.gpaHint && (
          <span className="text-xs text-text-muted">{data.gpaHint}</span>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <ul className="divide-y divide-white/5">
          {data.rows.map((row, idx) => (
            <li
              key={`${row.courseCode}-${idx}`}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <p className="truncate text-sm">{row.courseCode}</p>
              <div className="flex items-center gap-2">
                {row.marks != null && (
                  <span className="text-xs tabular-nums text-text-muted">
                    {row.marks}
                  </span>
                )}
                <Badge variant="secondary" className="tabular-nums">
                  {row.grade}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
