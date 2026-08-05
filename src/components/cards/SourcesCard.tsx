"use client";

import type { Citation } from "@/types/ui-blocks";

export function SourcesCard({ sources }: { sources: Citation[] }) {
  if (!sources.length) return null;

  return (
    <div className="space-y-1 border-t border-white/5 pt-2">
      <p className="text-[11px] text-text-muted">Sources</p>
      {sources.slice(0, 2).map((s, i) => (
        <p key={s.id} className="truncate text-xs text-text-muted">
          [{i + 1}] {s.title}
          {s.source.startsWith("http") ? (
            <>
              {" · "}
              <a
                href={s.source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange hover:underline"
              >
                link
              </a>
            </>
          ) : null}
        </p>
      ))}
    </div>
  );
}
