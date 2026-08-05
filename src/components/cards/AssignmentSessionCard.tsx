"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  Maximize2,
  Minimize2,
  ShieldAlert,
  Sparkles,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { AssignmentSessionData } from "@/types/ui-blocks";

type Phase =
  | "awaiting_allow"
  | "loading"
  | "filling"
  | "awaiting_submit"
  | "submitting"
  | "done"
  | "error"
  | "cancelled";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForPortal(
  iframe: HTMLIFrameElement,
  signal: { cancelled: boolean }
) {
  const started = Date.now();
  while (Date.now() - started < 15_000) {
    if (signal.cancelled) throw new Error("cancelled");
    const doc = iframe.contentDocument;
    if (doc?.getElementById("courseCode") && doc.getElementById("uploadBtn")) {
      return doc;
    }
    await sleep(100);
  }
  throw new Error("Portal timed out");
}

function attachDemoFile(input: HTMLInputElement, fileName: string) {
  const file = new File(["LPUGPT demo assignment submission"], fileName, {
    type: "application/pdf",
  });
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  const hint = input.ownerDocument.getElementById("fileHint");
  if (hint) hint.textContent = fileName;
}

function Shell({
  title,
  status,
  phase,
  collapsed,
  onToggle,
  onRetry,
  footer,
  children,
}: {
  title: string;
  status: string;
  phase: Phase;
  collapsed: boolean;
  onToggle: () => void;
  onRetry?: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const busy =
    phase === "loading" || phase === "filling" || phase === "submitting";
  return (
    <Card className="overflow-hidden border-white/10 bg-[#0d0d0d] shadow-2xl shadow-black/40 ring-1 ring-orange/15">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-white/5 bg-gradient-to-r from-[#161616] to-[#111] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{title}</p>
            <p className="truncate text-[10px] text-text-muted">
              assignment portal · mock ums
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              phase === "done"
                ? "success"
                : phase === "error" || phase === "cancelled"
                  ? "destructive"
                  : phase === "awaiting_submit" || phase === "awaiting_allow"
                    ? "warning"
                    : "default"
            }
            className="max-w-[160px] gap-1 truncate"
          >
            {busy && <Loader2 className="h-3 w-3 animate-spin" />}
            <span className="truncate">{status}</span>
          </Badge>
          {phase === "error" && onRetry && (
            <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
              Retry
            </Button>
          )}
          {(phase === "done" || phase === "awaiting_allow") && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={onToggle}
            >
              {collapsed ? (
                <Maximize2 className="h-3.5 w-3.5" />
              ) : (
                <Minimize2 className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="relative p-0">
        <div
          className={cn(
            "overflow-hidden bg-[#e8ecf1] transition-[height] duration-500",
            collapsed ? "h-14" : "h-[380px]"
          )}
        >
          {children}
        </div>
        {collapsed && phase === "done" && (
          <button
            type="button"
            onClick={onToggle}
            className="absolute inset-x-0 bottom-0 flex h-14 items-center justify-center bg-gradient-to-t from-black/50 to-transparent text-xs font-medium text-white"
          >
            Show UMS window
          </button>
        )}
      </CardContent>
      {footer}
    </Card>
  );
}

export function AssignmentSessionCard({ data }: { data: AssignmentSessionData }) {
  const requireApproval = data.requireApproval !== false;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [phase, setPhase] = useState<Phase>(
    requireApproval ? "awaiting_allow" : "loading"
  );
  const [status, setStatus] = useState(
    requireApproval ? "Waiting for approval" : "Opening portal…"
  );
  const [allowed, setAllowed] = useState(!requireApproval);
  const [collapsed, setCollapsed] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [resultLabel, setResultLabel] = useState<string | null>(null);
  const [resultStatus, setResultStatus] = useState<string | null>(null);
  const gateRef = useRef<{ doc: Document; btn: HTMLButtonElement | null } | null>(
    null
  );

  const finishSubmit = useCallback(
    async (doc: Document, btn: HTMLButtonElement | null) => {
      setPhase("submitting");
      setStatus("Uploading…");
      btn?.click();

      const started = Date.now();
      while (Date.now() - started < 12_000) {
        const box = doc.getElementById("successBox");
        if (box && getComputedStyle(box).display !== "none") break;
        if (btn && /fail|error|unauth/i.test(btn.innerText)) {
          throw new Error(btn.innerText || "Upload failed");
        }
        await sleep(150);
      }

      const label =
        doc.getElementById("uploadedCourse")?.textContent?.trim() ||
        `${data.courseCode} · ${data.assignmentTitle}`;

      const list = await fetch("/api/mock-erp/assignments/submit", {
        credentials: "include",
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      const task = list?.tasks?.find(
        (t: { courseCode: string }) => t.courseCode === data.courseCode
      );

      setPhase("done");
      setStatus("Submitted");
      setResultLabel(label);
      setResultStatus(task?.status || "SUBMITTED");
      setTimeout(() => setCollapsed(true), 900);
      gateRef.current = null;
    },
    [data]
  );

  const run = useCallback(
    async (signal: { cancelled: boolean }) => {
      const iframe = iframeRef.current;
      if (!iframe) return;
      setPhase("loading");
      setStatus("Connecting…");
      try {
        const doc = await waitForPortal(iframe, signal);
        if (signal.cancelled) return;

        setPhase("filling");
        setStatus("Selecting assignment…");
        const select = doc.getElementById("courseCode") as HTMLSelectElement | null;
        if (select) {
          select.value = data.courseCode;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
        await sleep(350);
        if (signal.cancelled) return;

        setStatus("Attaching file…");
        const fileInput = doc.getElementById(
          "fileUpload"
        ) as HTMLInputElement | null;
        if (fileInput) {
          attachDemoFile(fileInput, data.fileName || "assignment-demo.pdf");
        }
        await sleep(500);
        if (signal.cancelled) return;

        const btn = doc.getElementById("uploadBtn") as HTMLButtonElement | null;
        gateRef.current = { doc, btn };
        setPhase("awaiting_submit");
        setStatus("Your move");
      } catch (err) {
        if (signal.cancelled || (err instanceof Error && err.message === "cancelled"))
          return;
        setPhase("error");
        setStatus(err instanceof Error ? err.message : "Failed");
      }
    },
    [data]
  );

  useEffect(() => {
    if (!allowed) return;
    const signal = { cancelled: false };
    const t = window.setTimeout(() => void run(signal), 80);
    return () => {
      signal.cancelled = true;
      window.clearTimeout(t);
    };
  }, [allowed, run, nonce]);

  return (
    <div className="space-y-3">
      <Shell
        title={data.title || "Mock UMS · Assignments"}
        status={status}
        phase={phase}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        onRetry={() => {
          setResultLabel(null);
          setCollapsed(false);
          setAllowed(true);
          setNonce((n) => n + 1);
        }}
        footer={
          <>
            <AnimatePresence>
              {phase === "awaiting_allow" && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="border-t border-white/10 bg-gradient-to-b from-[#141414]/95 to-[#0f0f0f] p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange/15 ring-1 ring-orange/25">
                      <Sparkles className="h-4 w-4 text-orange" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <div className="mb-1 flex flex-wrap gap-2">
                          <Badge variant="default">Needs approval</Badge>
                          <Badge variant="secondary" className="gap-1">
                            <Upload className="h-3 w-3" />
                            Before deadline
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold">
                          Submit {data.courseCode} assignment?
                        </p>
                        <p className="mt-1 text-xs text-text-muted leading-relaxed">
                          {data.assignmentTitle}. {data.dueLabel}. Portal stays
                          visible — nothing uploads until you confirm.
                        </p>
                      </div>
                      <Separator className="bg-white/10" />
                      <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm">
                        <p className="text-[11px] uppercase tracking-wide text-text-muted">
                          Proposed
                        </p>
                        <p className="mt-1 font-medium">
                          {data.courseCode} · {data.assignmentTitle}
                        </p>
                        <p className="text-xs text-text-muted">{data.dueLabel}</p>
                        <p className="mt-1 text-xs text-text-muted">
                          File: {data.fileName || "assignment-demo.pdf"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="min-w-[108px]"
                          onClick={() => {
                            setCollapsed(false);
                            setAllowed(true);
                            setStatus("Starting…");
                          }}
                        >
                          Allow
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="min-w-[108px]"
                          onClick={() => {
                            setPhase("cancelled");
                            setStatus("Skipped");
                          }}
                        >
                          Skip
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {phase === "awaiting_submit" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-t border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-[#141414] to-[#141414] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15">
                        <ShieldAlert className="h-4 w-4 text-amber-400" />
                      </span>
                      <div>
                        <p className="text-sm font-medium">Confirm upload?</p>
                        <p className="text-xs text-text-muted">
                          Form is ready. Confirm to click Upload Assignment.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          const g = gateRef.current;
                          if (!g) return;
                          void finishSubmit(g.doc, g.btn).catch((err) => {
                            setPhase("error");
                            setStatus(
                              err instanceof Error ? err.message : "Failed"
                            );
                          });
                        }}
                      >
                        Confirm submit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          gateRef.current = null;
                          setPhase("cancelled");
                          setStatus("Cancelled");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {phase === "cancelled" && (
              <div className="flex items-center gap-2 border-t border-white/5 px-4 py-3 text-sm text-text-muted">
                <Badge variant="secondary">No changes</Badge>
                Assignment was not submitted.
              </div>
            )}
          </>
        }
      >
        <div
          className={cn(
            "relative h-full w-full",
            phase === "awaiting_allow" && "pointer-events-none"
          )}
        >
          <iframe
            key={nonce}
            ref={iframeRef}
            title="Mock UMS assignments"
            src={data.url}
            className="h-full min-h-[380px] w-full border-0 bg-white"
          />
          {phase === "awaiting_allow" && (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
          )}
        </div>
      </Shell>

      {resultLabel && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-emerald-500/20">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Assignment submitted
                </CardTitle>
                <Badge variant={resultStatus === "LATE" ? "warning" : "success"}>
                  {resultStatus || "SUBMITTED"}
                </Badge>
              </div>
              <CardDescription>{resultLabel}</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-text-muted">
              Mock UMS only — not real LPU UMS.
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
