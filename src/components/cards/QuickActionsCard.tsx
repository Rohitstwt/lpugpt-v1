"use client";

import { Button } from "@/components/ui/button";

type QuickActionsData = {
  actions: Array<{ label: string; query: string; icon?: string }>;
};

export function QuickActionsCard({
  data,
  onAction,
}: {
  data: QuickActionsData;
  onAction?: (query: string) => void;
}) {
  if (!data.actions.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {data.actions.slice(0, 3).map((action) => (
        <Button
          key={action.query}
          variant="ghost"
          size="sm"
          className="h-7 px-2.5 text-xs text-text-muted hover:text-text"
          onClick={() => onAction?.(action.query)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
