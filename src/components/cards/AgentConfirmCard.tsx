"use client";

import { LiveBrowserCard } from "@/components/cards/LiveBrowserCard";
import type { AgentConfirmData } from "@/types/ui-blocks";

/**
 * Approval + live UMS window are unified so the portal glance never vanishes.
 */
export function AgentConfirmCard({ data }: { data: AgentConfirmData }) {
  if (data.action.type !== "live_browser") return null;

  return (
    <LiveBrowserCard
      data={{
        ...data.action.data,
        requireApproval: true,
        dueLines:
          data.action.data.dueLines ??
          data.bullets?.filter((b) => !b.toLowerCase().includes("skip")) ??
          undefined,
      }}
      requirePayConfirm
    />
  );
}
