import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const key =
    req.headers.get("x-erp-agent-key") ||
    new URL(req.url).searchParams.get("key") ||
    "";
  const expected = process.env.ERP_AGENT_KEY || "lpugpt-mock-agent";
  if (key !== expected) {
    return NextResponse.json({ error: "Invalid agent key" }, { status: 401 });
  }

  const rl = rateLimit("assign-agent-submit", 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many agent uploads." }, { status: 429 });
  }

  let body: { courseCode?: string; fileName?: string; studentEmail?: string } =
    {};
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

  const courseCode = (body.courseCode || "CSE301").toUpperCase();
  const task =
    (await prisma.assignmentTask.findFirst({
      where: { userId: student.id, courseCode, status: "PENDING" },
      orderBy: { dueDate: "asc" },
    })) ||
    (await prisma.assignmentTask.findFirst({
      where: { userId: student.id, courseCode },
      orderBy: { dueDate: "asc" },
    }));

  if (!task) {
    return NextResponse.json({ error: "No assignment found" }, { status: 404 });
  }

  const late = task.dueDate.getTime() < Date.now();
  const updated = await prisma.assignmentTask.update({
    where: { id: task.id },
    data: {
      status: late ? "LATE" : "SUBMITTED",
      submittedAt: new Date(),
      fileName: body.fileName || "assignment-demo.pdf",
    },
  });

  return NextResponse.json({
    ok: true,
    label: `${updated.courseCode} · ${updated.title}`,
    status: updated.status,
    task: updated,
  });
}
