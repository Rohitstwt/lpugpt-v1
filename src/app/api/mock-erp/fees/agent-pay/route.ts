import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/security";

export const runtime = "nodejs";

/**
 * Agent-only pay endpoint used by Puppeteer when driving Mock UMS.
 * Guarded by ERP_AGENT_KEY (default demo key for local mock ERP).
 */
export async function POST(req: NextRequest) {
  const key =
    req.headers.get("x-erp-agent-key") ||
    new URL(req.url).searchParams.get("key") ||
    "";
  const expected = process.env.ERP_AGENT_KEY || "lpugpt-mock-agent";
  if (key !== expected) {
    return NextResponse.json({ error: "Invalid agent key" }, { status: 401 });
  }

  const rl = rateLimit("mock-fee-agent-pay", 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many agent payments." }, { status: 429 });
  }

  let body: { feeType?: string; studentEmail?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const student =
    (await prisma.user.findFirst({
      where: { email: body.studentEmail || "student@lpu.in", role: "STUDENT" },
    })) || (await prisma.user.findFirst({ where: { role: "STUDENT" } }));

  if (!student) {
    return NextResponse.json({ error: "No student account" }, { status: 404 });
  }

  const feeType = (body.feeType || "").toLowerCase();
  const categoryHint = feeType.includes("hostel")
    ? "hostel"
    : feeType.includes("exam")
      ? "exam"
      : feeType.includes("tuition")
        ? "tuition"
        : undefined;

  // Pay matching due invoice first; if none, pay any outstanding
  let invoice = await prisma.feeInvoice.findFirst({
    where: {
      userId: student.id,
      status: { in: ["DUE", "PARTIAL", "OVERDUE"] },
      ...(categoryHint ? { category: categoryHint } : {}),
    },
    orderBy: { dueDate: "asc" },
  });

  if (!invoice) {
    invoice = await prisma.feeInvoice.findFirst({
      where: {
        userId: student.id,
        status: { in: ["DUE", "PARTIAL", "OVERDUE"] },
      },
      orderBy: { dueDate: "asc" },
    });
  }

  if (!invoice) {
    return NextResponse.json({ error: "No due invoice" }, { status: 404 });
  }

  const updated = await prisma.feeInvoice.update({
    where: { id: invoice.id },
    data: { paidInr: invoice.amountInr, status: "PAID" },
  });

  const txnId = `TXN${Date.now().toString().slice(-10)}`;
  return NextResponse.json({
    ok: true,
    txnId,
    feeLabel: `${updated.category} · ${updated.term}`,
    amountInr: updated.amountInr,
  });
}
