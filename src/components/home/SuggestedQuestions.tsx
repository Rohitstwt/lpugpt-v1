"use client";

import { motion } from "framer-motion";

const SUGGESTIONS = [
  "How do I go from Block 38 to Block 13?",
  "Upcoming campus events",
  "Where is the Central Library?",
  "CSE faculty directory",
  "Nearby restaurants on campus",
  "Hostel information",
];

export function SuggestedQuestions({
  onSelect,
  className,
}: {
  onSelect: (query: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
        Try asking
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s, i) => (
          <motion.button
            key={s}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            onClick={() => onSelect(s)}
            className="rounded-full border border-border bg-surface/60 px-4 py-2 text-sm text-text-muted backdrop-blur-sm transition hover:border-orange/40 hover:text-text"
          >
            {s}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
