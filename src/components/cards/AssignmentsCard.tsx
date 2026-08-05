"use client";

import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssignmentsCardData } from "@/types/ui-blocks";

export function AssignmentsCard({ data }: { data: AssignmentsCardData }) {
  return (
    <Card className="border-white/8 bg-transparent shadow-none">
      <CardHeader className="px-4 py-3 pb-1">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <ClipboardList className="h-3.5 w-3.5 text-text-muted" />
          {data.title || "Assignments"}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        {!data.tasks.length ? (
          <p className="py-2 text-sm text-text-muted">Nothing pending.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {data.tasks.map((task, idx) => (
              <li
                key={task.id ?? `${task.courseCode}-${idx}`}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    {task.courseCode} · {task.title}
                  </p>
                  <p className="text-xs text-text-muted">{task.dueLabel}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {task.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
