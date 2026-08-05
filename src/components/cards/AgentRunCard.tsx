"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle, Loader2, XCircle, Bot } from "lucide-react";
import type { z } from "zod";
import type { AgentRunDataSchema } from "@/types/ui-blocks";

type AgentRunData = z.infer<typeof AgentRunDataSchema>;

function StepIcon({ status }: { status: AgentRunData["steps"][number]["status"] }) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === "fail") return <XCircle className="h-4 w-4 text-red-400" />;
  if (status === "running")
    return <Loader2 className="h-4 w-4 animate-spin text-orange" />;
  return <Circle className="h-4 w-4 text-text-muted" />;
}

export function AgentRunCard({ data }: { data: AgentRunData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-white/10 bg-[#111]/80 backdrop-blur"
    >
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-orange" />
          <p className="text-sm font-semibold">ERP Agent · {data.workflow}</p>
        </div>
        {data.portalUrl && (
          <a
            href={data.portalUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-orange hover:underline"
          >
            Open portal
          </a>
        )}
      </div>
      <div className="space-y-3 p-4">
        {data.steps.map((step, i) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex gap-3"
          >
            <div className="mt-0.5">
              <StepIcon status={step.status} />
            </div>
            <div>
              <p className="text-sm font-medium text-text">{step.title}</p>
              <p className="text-xs text-text-muted leading-relaxed">{step.detail}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
