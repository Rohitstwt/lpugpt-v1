"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimetableCardData } from "@/types/ui-blocks";

export function TimetableCard({ data }: { data: TimetableCardData }) {
  return (
    <Card className="border-white/8 bg-transparent shadow-none">
      <CardHeader className="px-4 py-3 pb-1">
        <CardTitle className="text-sm font-medium">Timetable</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <ul className="divide-y divide-white/5">
          {data.entries.map((entry) => (
            <li key={entry.courseCode} className="py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm">{entry.courseCode}</p>
                <p className="text-xs text-text-muted">{entry.schedule}</p>
              </div>
              <p className="text-xs text-text-muted">
                {entry.location}
                {entry.faculty ? ` · ${entry.faculty}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
