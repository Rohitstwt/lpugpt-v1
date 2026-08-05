import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized — log in as student first." }, { status: 401 });
  }

  const rl = rateLimit(`mock-fee-pay:${user.id}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many payments." }, { status: 429 });
  }

  let body: { feeType?: string; invoiceId?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const studentId =
    user.role === "ADMIN"
      ? (
          await prisma.user.findFirst({ where: { email: "student@lpu.in" } })
        )?.id ?? user.id
      : user.id;

  if (user.role !== "STUDENT" && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only student accounts can pay fees in mock ERP." },
      { status: 403 }
    );
  }

  const feeType = (body.feeType || "").toLowerCase();
  const categoryHint =
    feeType.includes("hostel")
      ? "hostel"
      : feeType.includes("exam")
        ? "exam"
        : feeType.includes("tuition")
          ? "tuition"
          : undefined;

  const invoice = body.invoiceId
    ? await prisma.feeInvoice.findFirst({
        where: { id: body.invoiceId, userId: studentId },
      })
    : await prisma.feeInvoice.findFirst({
        where: {
          userId: studentId,
          status: { in: ["DUE", "PARTIAL", "OVERDUE"] },
          ...(categoryHint ? { category: categoryHint } : {}),
        },
        orderBy: { dueDate: "asc" },
      });

  if (!invoice) {
    return NextResponse.json(
      { error: "No matching due invoice found." },
      { status: 404 }
    );
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
    invoiceId: updated.id,
  });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const studentId =
    user.role === "ADMIN"
      ? (
          await prisma.user.findFirst({ where: { email: "student@lpu.in" } })
        )?.id ?? user.id
      : user.id;

  const invoices = await prisma.feeInvoice.findMany({
    where: { userId: studentId },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json({ invoices });
}
