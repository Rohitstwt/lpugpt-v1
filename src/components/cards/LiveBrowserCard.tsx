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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PaymentResultCard } from "@/components/cards/PaymentResultCard";
import { cn } from "@/lib/utils";
import type { z } from "zod";
import type { LiveBrowserDataSchema, PaymentResultData } from "@/types/ui-blocks";

type LiveBrowserData = z.infer<typeof LiveBrowserDataSchema>;

type Phase =
  | "awaiting_allow"
  | "loading"
  | "filling"
  | "awaiting_pay"
  | "paying"
  | "done"
  | "error"
  | "cancelled";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function typeInto(
  el: HTMLInputElement | HTMLTextAreaElement,
  text: string,
  delay = 28
) {
  el.focus();
  el.value = "";
  el.dispatchEvent(new Event("input", { bubbles: true }));
  for (const ch of text) {
    el.value += ch;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(delay);
  }
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

async function waitForPortalDoc(
  iframe: HTMLIFrameElement,
  signal: { cancelled: boolean },
  timeoutMs = 15_000
): Promise<Document> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (signal.cancelled) throw new Error("cancelled");
    try {
      const doc = iframe.contentDocument;
      if (doc?.getElementById("feeType") && doc.getElementById("payBtn")) {
        return doc;
      }
    } catch {
      // ignore
    }
    await sleep(100);
  }
  throw new Error("Portal timed out");
}

function BrowserChrome({
  title,
  status,
  phase,
  children,
  footer,
  onRetry,
  collapsed,
  onToggleCollapse,
}: {
  title: string;
  status: string;
  phase: Phase;
  children: ReactNode;
  footer?: ReactNode;
  onRetry?: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const busy =
    phase === "loading" || phase === "filling" || phase === "paying";

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
            <p className="truncate text-xs font-medium text-text">{title}</p>
            <p className="truncate text-[10px] text-text-muted">
              secure session · mock ums
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
                  : phase === "awaiting_pay" || phase === "awaiting_allow"
                    ? "warning"
                    : "default"
            }
            className="max-w-[160px] gap-1 truncate"
          >
            {busy && <Loader2 className="h-3 w-3 shrink-0 animate-spin" />}
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
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expand" : "Minimize"}
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
            "overflow-hidden bg-[#e8ecf1] transition-[height] duration-500 ease-out",
            collapsed ? "h-14" : "h-[380px]"
          )}
        >
          {children}
        </div>
        {collapsed && phase === "done" && (
          <button
            type="button"
            onClick={onToggleCollapse}
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

export function LiveBrowserCard({
  data,
  requirePayConfirm = true,
}: {
  data: LiveBrowserData;
  requirePayConfirm?: boolean;
}) {
  const requireApproval = data.requireApproval !== false;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [phase, setPhase] = useState<Phase>(
    requireApproval ? "awaiting_allow" : "loading"
  );
  const [status, setStatus] = useState(
    requireApproval ? "Waiting for approval" : "Opening Mock UMS…"
  );
  const [result, setResult] = useState<PaymentResultData | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [iframeNonce, setIframeNonce] = useState(0);
  const [allowed, setAllowed] = useState(!requireApproval);
  const payGateRef = useRef<{
    doc: Document;
    btn: HTMLButtonElement | null;
  } | null>(null);
  const runSignal = useRef<{ cancelled: boolean }>({ cancelled: false });

  const finishPayment = useCallback(
    async (doc: Document, btn: HTMLButtonElement | null) => {
      setPhase("paying");
      setStatus("Submitting payment…");
      btn?.click();

      const payStarted = Date.now();
      while (Date.now() - payStarted < 12_000) {
        const receipt = doc.getElementById("receiptBox");
        if (receipt && getComputedStyle(receipt).display !== "none") break;
        if (btn && /fail|error|unauth/i.test(btn.innerText)) {
          throw new Error(btn.innerText || "Payment failed");
        }
        await sleep(150);
      }

      const txn =
        doc.getElementById("txnId")?.textContent?.trim() ||
        `TXN${Date.now().toString().slice(-10)}`;

      if (data.payAllRemaining !== false) {
        setStatus("Syncing dues…");
        await fetch("/api/mock-erp/fees/pay-all", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }).catch(() => undefined);
      }

      const summaryRes = await fetch("/api/mock-erp/fees/pay", {
        method: "GET",
        credentials: "include",
      });
      const summary = summaryRes.ok
        ? ((await summaryRes.json()) as {
            invoices?: Array<{
              id: string;
              term: string;
              category: string;
              amountInr: number;
              paidInr: number;
              status: string;
            }>;
          })
        : { invoices: [] };

      const invoices = summary.invoices || [];
      const totalDue = invoices.reduce(
        (s, inv) => s + Math.max(0, inv.amountInr - inv.paidInr),
        0
      );

      setPhase("done");
      setStatus("Complete");
      setResult({
        status: totalDue === 0 ? "success" : "partial",
        title: "Payment complete",
        paidLabel: `${data.feeCategory} · Mock UMS`,
        amountPaid: data.amountDue ?? 0,
        totalDue,
        txnId: txn,
        portalUrl: data.url.split("?")[0],
        invoices: invoices.map((inv) => ({
          id: inv.id,
          term: inv.term,
          category: inv.category,
          amountInr: inv.amountInr,
          paidInr: inv.paidInr,
          status: inv.status,
        })),
      });
      // Keep a peek of UMS — soft collapse, not sudden vanish
      setTimeout(() => setCollapsed(true), 900);
      payGateRef.current = null;
    },
    [data]
  );

  const runAutomation = useCallback(
    async (signal: { cancelled: boolean }) => {
      const iframe = iframeRef.current;
      if (!iframe) return;

      setPhase("loading");
      setStatus("Connecting to Mock UMS…");
      payGateRef.current = null;

      try {
        const doc = await waitForPortalDoc(iframe, signal);
        if (signal.cancelled) return;

        await sleep(200);
        setPhase("filling");
        setStatus("Selecting fee…");

        const feeType = doc.getElementById("feeType") as HTMLSelectElement | null;
        if (feeType) {
          feeType.value = data.feeCategory;
          feeType.dispatchEvent(new Event("change", { bubbles: true }));
        }
        await sleep(280);
        if (signal.cancelled) return;

        setStatus("Filling cardholder…");
        const name = doc.getElementById("cardName") as HTMLInputElement | null;
        if (name) await typeInto(name, data.studentName, 26);
        await sleep(120);
        if (signal.cancelled) return;

        setStatus("Entering card details…");
        const number = doc.getElementById(
          "cardNumber"
        ) as HTMLInputElement | null;
        if (number) await typeInto(number, "4111 1111 1111 1111", 16);
        await sleep(80);

        const expiry = doc.getElementById(
          "cardExpiry"
        ) as HTMLInputElement | null;
        if (expiry) await typeInto(expiry, "12/28", 32);
        const cvv = doc.getElementById("cardCvv") as HTMLInputElement | null;
        if (cvv) await typeInto(cvv, "123", 36);
        await sleep(300);
        if (signal.cancelled) return;

        const btn = doc.getElementById("payBtn") as HTMLButtonElement | null;

        if (requirePayConfirm) {
          payGateRef.current = { doc, btn };
          setPhase("awaiting_pay");
          setStatus("Your move");
          return;
        }

        await finishPayment(doc, btn);
      } catch (err) {
        if (
          signal.cancelled ||
          (err instanceof Error && err.message === "cancelled")
        ) {
          return;
        }
        setPhase("error");
        setStatus(err instanceof Error ? err.message : "Automation failed");
      }
    },
    [data, finishPayment, requirePayConfirm]
  );

  useEffect(() => {
    if (!allowed) return;
    runSignal.current = { cancelled: false };
    const signal = runSignal.current;
    const t = window.setTimeout(() => {
      void runAutomation(signal);
    }, 80);
    return () => {
      signal.cancelled = true;
      window.clearTimeout(t);
    };
  }, [allowed, runAutomation, iframeNonce]);

  const amountLabel =
    data.amountDue != null
      ? `₹${data.amountDue.toLocaleString("en-IN")}`
      : "your dues";

  return (
    <div className="space-y-3">
      <BrowserChrome
        title={data.title || "Mock UMS · Fee Gateway"}
        status={status}
        phase={phase}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        onRetry={() => {
          setResult(null);
          setCollapsed(false);
          setAllowed(true);
          setIframeNonce((n) => n + 1);
        }}
        footer={
          <>
            <AnimatePresence>
              {phase === "awaiting_allow" && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="border-t border-white/10 bg-gradient-to-b from-[#141414]/95 to-[#0f0f0f]"
                >
                  <div className="space-y-3 p-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange/15 ring-1 ring-orange/25">
                        <Sparkles className="h-4 w-4 text-orange" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge variant="default">Needs approval</Badge>
                          <Badge variant="secondary" className="gap-1">
                            <ShieldAlert className="h-3 w-3" />
                            You stay in control
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold text-text">
                          Open UMS and prepare a fee payment?
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-text-muted">
                          Portal stays visible. I’ll only fill the form after{" "}
                          <span className="text-text">Allow</span> — and I won’t
                          click Pay until you confirm.
                        </p>
                      </div>
                    </div>

                    {(data.dueLines?.length || data.amountDue != null) && (
                      <>
                        <Separator className="bg-white/10" />
                        <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5">
                          <p className="mb-2 text-[11px] uppercase tracking-wide text-text-muted">
                            Proposed
                          </p>
                          <ul className="space-y-1.5">
                            {(data.dueLines || []).map((line) => (
                              <li
                                key={line}
                                className="flex items-center gap-2 text-sm text-text-muted"
                              >
                                <span className="h-1 w-1 rounded-full bg-orange" />
                                {line}
                              </li>
                            ))}
                            {data.amountDue != null && (
                              <li className="pt-1 text-sm font-medium text-text">
                                Total {amountLabel}
                              </li>
                            )}
                          </ul>
                        </div>
                      </>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
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
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {phase === "awaiting_pay" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="border-t border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-[#141414] to-[#141414]"
                >
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
                        <ShieldAlert className="h-4 w-4 text-amber-400" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-text">
                          Confirm payment of {amountLabel}?
                        </p>
                        <p className="text-xs text-text-muted">
                          Form is filled. Confirm to click Pay Securely — or cancel.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          const gate = payGateRef.current;
                          if (!gate) return;
                          void finishPayment(gate.doc, gate.btn).catch((err) => {
                            setPhase("error");
                            setStatus(
                              err instanceof Error
                                ? err.message
                                : "Payment failed"
                            );
                          });
                        }}
                      >
                        Confirm pay
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          payGateRef.current = null;
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
                You stopped the agent. UMS was not charged.
              </div>
            )}
          </>
        }
      >
        {/* Portal stays mounted so the glance never disappears */}
        <div
          className={cn(
            "relative h-full w-full",
            phase === "awaiting_allow" && "pointer-events-none"
          )}
        >
          <iframe
            key={iframeNonce}
            ref={iframeRef}
            title="Mock UMS live browser"
            src={data.url}
            className="h-full min-h-[380px] w-full border-0 bg-white"
          />
          {phase === "awaiting_allow" && (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
          )}
        </div>
      </BrowserChrome>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <PaymentResultCard data={result} />
          </motion.div>
        )}
      </AnimatePresence>

      {phase === "done" && !result && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Done
            </CardTitle>
            <CardDescription>Payment finished in Mock UMS.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
