import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/security";

export const runtime = "nodejs";

function parseDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const TYPE_LABEL: Record<string, string> = {
  sick: "Sick leave",
  casual: "Casual leave",
  emergency: "Emergency leave",
  home: "Home visit",
};

export async function POST(req: NextRequest) {
  const key =
    req.headers.get("x-erp-agent-key") ||
    new URL(req.url).searchParams.get("key") ||
    "";
  const expected = process.env.ERP_AGENT_KEY || "lpugpt-mock-agent";
  if (key !== expected) {
    return NextResponse.json({ error: "Invalid agent key" }, { status: 401 });
  }

  const rl = rateLimit("leave-agent-apply", 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many agent submissions." }, { status: 429 });
  }

  let body: {
    leaveType?: string;
    fromDate?: string;
    toDate?: string;
    reason?: string;
    studentEmail?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const student =
    (await prisma.user.findFirst({
      where: {
        email: body.studentEmail || "student@lpu.in",
        role: "STUDENT",
      },
    })) || (await prisma.user.findFirst({ where: { role: "STUDENT" } }));

  if (!student) {
    return NextResponse.json({ error: "No student" }, { status: 404 });
  }

  const leaveType = (body.leaveType || "casual").toLowerCase();
  const from = parseDate(body.fromDate) ?? new Date();
  const to = parseDate(body.toDate) ?? from;
  const reason = (body.reason || "Leave requested via LPUGPT agent").trim();

  const created = await prisma.leaveApplication.create({
    data: {
      userId: student.id,
      leaveType,
      fromDate: from,
      toDate: to >= from ? to : from,
      reason,
      status: "PENDING",
    },
  });

  return NextResponse.json({
    ok: true,
    label: `${TYPE_LABEL[leaveType] || leaveType} · ${from.toLocaleDateString("en-IN")} – ${to.toLocaleDateString("en-IN")}`,
    status: created.status,
    application: created,
  });
}
