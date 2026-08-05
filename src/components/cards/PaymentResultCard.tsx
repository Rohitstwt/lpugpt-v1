"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ExternalLink, Receipt } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import type { z } from "zod";
import type { PaymentResultDataSchema } from "@/types/ui-blocks";

type PaymentResultData = z.infer<typeof PaymentResultDataSchema>;

export function PaymentResultCard({ data }: { data: PaymentResultData }) {
  const paidCount = data.invoices.filter((i) => i.status === "PAID").length;
  const progress =
    data.invoices.length === 0
      ? 100
      : Math.round((paidCount / data.invoices.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden border-orange/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </span>
                {data.title}
              </CardTitle>
              <CardDescription>{data.paidLabel}</CardDescription>
            </div>
            <Badge variant={data.status === "success" ? "success" : "warning"}>
              {data.status === "success" ? "Paid" : data.status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-bg-elevated/60 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-text-muted">
                Paid now
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                ₹{data.amountPaid.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-bg-elevated/60 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-text-muted">
                Balance
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                ₹{data.totalDue.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Clearance</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {data.imageUrl && (
            <div className="overflow-hidden rounded-xl border border-border bg-[#0b0b0b]">
              <div className="flex items-center gap-1.5 border-b border-white/5 bg-[#151515] px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500/90" />
                <span className="h-2 w-2 rounded-full bg-yellow-400/90" />
                <span className="h-2 w-2 rounded-full bg-green-500/90" />
                <span className="ml-2 text-[11px] text-text-muted">UMS receipt</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.imageUrl}
                alt="Payment receipt"
                className="max-h-56 w-full object-contain object-top bg-[#f0f2f5]"
              />
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            {data.invoices.map((inv) => (
              <div
                key={inv.id ?? `${inv.term}-${inv.category}`}
                className="flex items-center justify-between gap-3 rounded-lg px-1 py-1"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium capitalize">
                    {inv.category}
                  </p>
                  <p className="text-xs text-text-muted">{inv.term}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm tabular-nums">
                    ₹{inv.amountInr.toLocaleString("en-IN")}
                  </span>
                  <Badge
                    variant={
                      inv.status === "PAID"
                        ? "success"
                        : inv.status === "OVERDUE"
                          ? "destructive"
                          : "warning"
                    }
                  >
                    {inv.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {data.txnId && (
            <p className="flex items-center gap-1.5 text-xs text-text-muted">
              <Receipt className="h-3.5 w-3.5" />
              {data.txnId}
            </p>
          )}
        </CardContent>

        {data.portalUrl && (
          <CardFooter>
            <Button variant="secondary" size="sm" asChild className="w-full">
              <a href={data.portalUrl} target="_blank" rel="noreferrer">
                Open UMS
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
}
