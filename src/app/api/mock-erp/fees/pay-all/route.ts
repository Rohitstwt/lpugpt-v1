import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/security";

export const runtime = "nodejs";

/** Pay every outstanding mock invoice for the current student. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`mock-fee-pay-all:${user.id}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const studentId =
    user.role === "ADMIN"
      ? (
          await prisma.user.findFirst({ where: { email: "student@lpu.in" } })
        )?.id ?? user.id
      : user.id;

  if (user.role !== "STUDENT" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Students only" }, { status: 403 });
  }

  const due = await prisma.feeInvoice.findMany({
    where: {
      userId: studentId,
      status: { in: ["DUE", "PARTIAL", "OVERDUE"] },
    },
  });

  for (const inv of due) {
    await prisma.feeInvoice.update({
      where: { id: inv.id },
      data: { paidInr: inv.amountInr, status: "PAID" },
    });
  }

  return NextResponse.json({ ok: true, paid: due.length });
}
