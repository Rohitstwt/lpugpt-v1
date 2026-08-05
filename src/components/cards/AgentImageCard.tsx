"use client";

import { motion } from "framer-motion";
import type { z } from "zod";
import type { AgentImageDataSchema } from "@/types/ui-blocks";

type AgentImageData = z.infer<typeof AgentImageDataSchema>;

export function AgentImageCard({ data }: { data: AgentImageData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-xl border border-white/10 bg-[#0b0b0b]"
    >
      <div className="flex items-center gap-1.5 border-b border-white/5 bg-[#151515] px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-red-500/90" />
        <span className="h-2 w-2 rounded-full bg-yellow-400/90" />
        <span className="h-2 w-2 rounded-full bg-green-500/90" />
        <p className="ml-2 text-[11px] text-text-muted">{data.title || "UMS"}</p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={data.imageUrl}
        alt={data.caption || "Payment receipt"}
        className="max-h-[320px] w-full object-contain object-top bg-[#f0f2f5]"
      />
    </motion.div>
  );
}
