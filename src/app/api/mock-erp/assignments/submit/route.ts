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

export async function GET(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studentId = await resolveStudentId(user);
  const tasks = await prisma.assignmentTask.findMany({
    where: { userId: studentId },
    orderBy: { dueDate: "asc" },
  });
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "STUDENT" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Students only" }, { status: 403 });
  }

  const rl = rateLimit(`assign-submit:${user.id}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many uploads." }, { status: 429 });
  }

  let body: { courseCode?: string; fileName?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const studentId = await resolveStudentId(user);
  const courseCode = (body.courseCode || "CSE301").toUpperCase();

  const task =
    (await prisma.assignmentTask.findFirst({
      where: { userId: studentId, courseCode, status: "PENDING" },
      orderBy: { dueDate: "asc" },
    })) ||
    (await prisma.assignmentTask.findFirst({
      where: { userId: studentId, courseCode },
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
