import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

function pct(present: number, total: number) {
  if (!total) return 0;
  return Math.round((present / total) * 1000) / 10;
}

export async function erpGetAttendance(user: SessionUser, courseCode?: string) {
  if (user.role === "TEACHER") {
    return {
      ok: true as const,
      intent: "ERP_ATTENDANCE",
      message:
        "Teachers: ask students to check their own attendance in LPUGPT, or use the ERP faculty console (mock).",
    };
  }

  const where = {
    userId: user.id,
    ...(courseCode
      ? { course: { code: courseCode.replace(/\s+/g, "").toUpperCase() } }
      : {}),
  };

  const rows = await prisma.attendanceRecord.findMany({
    where,
    include: { course: true },
    orderBy: { course: { code: "asc" } },
  });

  if (!rows.length) {
    return {
      ok: false as const,
      intent: "ERP_ATTENDANCE",
      message: courseCode
        ? `No attendance found in mock ERP for ${courseCode}.`
        : "No attendance records in mock ERP for this student.",
    };
  }

  const lines = rows.map((r) => {
    const p = pct(r.present, r.total);
    const flag = p < 75 ? " ⚠ below 75%" : "";
    return `${r.course.code} — ${r.course.name}: ${r.present}/${r.total} (${p}%)${flag}`;
  });

  return {
    ok: true as const,
    intent: "ERP_ATTENDANCE",
    message: `Mock ERP attendance for ${user.name}:\n${lines.join("\n")}`,
  };
}

export async function erpGetFees(user: SessionUser) {
  if (user.role !== "STUDENT" && user.role !== "ADMIN") {
    return {
      ok: true as const,
      intent: "ERP_FEES",
      message: "Fee dues in this mock ERP are student-account scoped.",
    };
  }

  const targetId =
    user.role === "ADMIN"
      ? (
          await prisma.user.findFirst({
            where: { role: "STUDENT", email: "student@lpu.in" },
          })
        )?.id ?? user.id
      : user.id;

  const invoices = await prisma.feeInvoice.findMany({
    where: { userId: targetId },
    orderBy: { dueDate: "asc" },
  });

  if (!invoices.length) {
    return {
      ok: false as const,
      intent: "ERP_FEES",
      message: "No fee invoices found in mock ERP.",
    };
  }

  const lines = invoices.map((inv) => {
    const due = inv.amountInr - inv.paidInr;
    return `${inv.term} · ${inv.category}: ₹${inv.amountInr} (paid ₹${inv.paidInr}, balance ₹${due}) — ${inv.status}, due ${inv.dueDate.toISOString().slice(0, 10)}`;
  });

  const balance = invoices.reduce((s, inv) => s + (inv.amountInr - inv.paidInr), 0);

  return {
    ok: true as const,
    intent: "ERP_FEES",
    message: `Mock ERP fees:\n${lines.join("\n")}\n\nTotal outstanding: ₹${balance}`,
  };
}

export async function erpGetResults(user: SessionUser, term?: string) {
  if (user.role === "TEACHER") {
    return {
      ok: true as const,
      intent: "ERP_RESULTS",
      message: "Results in mock ERP are visible on the student account.",
    };
  }

  const rows = await prisma.gradeRecord.findMany({
    where: {
      userId: user.id,
      ...(term ? { term } : {}),
    },
    include: { course: true },
    orderBy: [{ term: "desc" }, { course: { code: "asc" } }],
  });

  if (!rows.length) {
    return {
      ok: false as const,
      intent: "ERP_RESULTS",
      message: "No grade/result records in mock ERP yet.",
    };
  }

  const lines = rows.map(
    (r) =>
      `${r.term} · ${r.course.code} (${r.course.name}): grade ${r.grade}${
        r.marks != null ? `, marks ${r.marks}` : ""
      }, credits ${r.credits}`
  );

  return {
    ok: true as const,
    intent: "ERP_RESULTS",
    message: `Mock ERP results for ${user.name}:\n${lines.join("\n")}`,
  };
}

export async function erpGetHostel(user: SessionUser) {
  if (user.role !== "STUDENT" && user.role !== "ADMIN") {
    return {
      ok: true as const,
      intent: "ERP_HOSTEL",
      message: "Hostel allotment in mock ERP is student-scoped.",
    };
  }

  const userId =
    user.role === "ADMIN"
      ? (
          await prisma.user.findFirst({
            where: { email: "student@lpu.in" },
          })
        )?.id ?? user.id
      : user.id;

  const hostel = await prisma.hostelAllocation.findUnique({ where: { userId } });
  if (!hostel) {
    return {
      ok: false as const,
      intent: "ERP_HOSTEL",
      message: "No hostel allotment found in mock ERP.",
    };
  }

  return {
    ok: true as const,
    intent: "ERP_HOSTEL",
    message: `Mock ERP hostel: Block ${hostel.block}, Room ${hostel.room}${
      hostel.bed ? `, Bed ${hostel.bed}` : ""
    }. Status: ${hostel.status}.${hostel.warden ? ` Warden: ${hostel.warden}.` : ""}`,
  };
}

export async function erpGetSummary(user: SessionUser) {
  const [attendance, fees, results, hostel] = await Promise.all([
    erpGetAttendance(user),
    erpGetFees(user),
    erpGetResults(user),
    erpGetHostel(user),
  ]);

  return {
    ok: true as const,
    intent: "ERP_SUMMARY",
    message: [
      "—— Mock University ERP snapshot ——",
      attendance.message,
      "",
      fees.message,
      "",
      results.message,
      "",
      hostel.message,
      "",
      "(Demo data only — not connected to real LPU UMS.)",
    ].join("\n"),
  };
}

export async function erpMarkFeePaid(user: SessionUser, invoiceId?: string) {
  if (user.role !== "STUDENT" && user.role !== "ADMIN") {
    return {
      ok: false as const,
      intent: "ERP_PAY",
      message: "Only the student account can simulate a fee payment in mock ERP.",
    };
  }

  const invoice = invoiceId
    ? await prisma.feeInvoice.findFirst({
        where: { id: invoiceId, userId: user.id },
      })
    : await prisma.feeInvoice.findFirst({
        where: {
          userId: user.id,
          status: { in: ["DUE", "PARTIAL", "OVERDUE"] },
        },
        orderBy: { dueDate: "asc" },
      });

  if (!invoice) {
    return {
      ok: false as const,
      intent: "ERP_PAY",
      message: "No due invoice found to pay in mock ERP.",
    };
  }

  const updated = await prisma.feeInvoice.update({
    where: { id: invoice.id },
    data: {
      paidInr: invoice.amountInr,
      status: "PAID",
    },
  });

  return {
    ok: true as const,
    intent: "ERP_PAY",
    message: `Mock payment successful: ${updated.term} ${updated.category} marked PAID (₹${updated.amountInr}).`,
  };
}
