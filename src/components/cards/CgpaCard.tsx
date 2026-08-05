"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CgpaCardData } from "@/types/ui-blocks";

export function CgpaCard({ data }: { data: CgpaCardData }) {
  return (
    <Card className="border-white/8 bg-transparent shadow-none">
      <CardHeader className="flex-row items-baseline justify-between space-y-0 px-4 py-3 pb-1">
        <CardTitle className="text-sm font-medium">SGPA</CardTitle>
        <p className="text-xl font-semibold tabular-nums tracking-tight">
          {data.sgpa.toFixed(2)}
          {data.band ? (
            <span className="ml-2 text-xs font-normal text-text-muted">
              {data.band}
            </span>
          ) : null}
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <ul className="divide-y divide-white/5">
          {data.rows.map((row, idx) => (
            <li
              key={`${row.courseCode}-${idx}`}
              className="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <span className="text-text-muted">
                {row.courseCode} · {row.grade}
              </span>
              <span className="tabular-nums">
                {row.gradePoint}×{row.credits}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-text-muted">
          {data.totalCredits} credits · 10-pt scale
        </p>
      </CardContent>
    </Card>
  );
}
