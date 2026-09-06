import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/security";

export const runtime = "nodejs";

async function resolveStudentId(user: { id: string; role: string }) {
  if (user.role === "ADMIN") {
    return (
      (await prisma.user.findFirst({ where: { email: "student@lpu.in" } }))
        ?.id ?? user.id
    );
  }
  return user.id;
}

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

export async function GET(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studentId = await resolveStudentId(user);
  const applications = await prisma.leaveApplication.findMany({
    where: { userId: studentId },
    orderBy: { appliedAt: "desc" },
  });
  return NextResponse.json({ applications });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "STUDENT" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Students only" }, { status: 403 });
  }

  const rl = rateLimit(`leave-apply:${user.id}`, 15, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many applications." }, { status: 429 });
  }

  let body: {
    leaveType?: string;
    fromDate?: string;
    toDate?: string;
    reason?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const studentId = await resolveStudentId(user);
  const leaveType = (body.leaveType || "casual").toLowerCase();
  const from = parseDate(body.fromDate) ?? new Date();
  const to = parseDate(body.toDate) ?? from;
  const reason = (body.reason || "Leave requested via LPUGPT").trim();

  const created = await prisma.leaveApplication.create({
    data: {
      userId: studentId,
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
