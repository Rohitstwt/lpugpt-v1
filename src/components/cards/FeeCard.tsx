"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FeeCardData } from "@/types/ui-blocks";

export function FeeCard({ data }: { data: FeeCardData }) {
  return (
    <Card className="border-white/8 bg-transparent shadow-none">
      <CardHeader className="flex-row items-center justify-between space-y-0 px-4 py-3 pb-1">
        <CardTitle className="text-sm font-medium">Fees</CardTitle>
        {data.totalDue !== undefined && (
          <span className="text-xs tabular-nums text-text-muted">
            {data.totalDue > 0
              ? `Due ₹${data.totalDue.toLocaleString("en-IN")}`
              : "Clear"}
          </span>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <ul className="divide-y divide-white/5">
          {data.invoices.map((inv) => (
            <li
              key={inv.id ?? `${inv.term}-${inv.category}`}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm capitalize">{inv.category}</p>
                <p className="text-xs text-text-muted">{inv.term}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm tabular-nums">
                  ₹{inv.amountInr.toLocaleString("en-IN")}
                </span>
                <Badge variant="secondary">{inv.status}</Badge>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
