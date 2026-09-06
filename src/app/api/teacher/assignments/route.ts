import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publishMeshEvent } from "@/lib/mesh";

export async function GET(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get courses taught by this teacher
  const courses = await prisma.course.findMany({
    where: user.role === "ADMIN" ? {} : { teacherId: user.id },
    select: { code: true },
  });
  const courseCodes = courses.map((c) => c.code);

  const assignments = await prisma.assignmentTask.findMany({
    where: user.role === "ADMIN" ? {} : { courseCode: { in: courseCodes } },
    include: {
      user: { select: { id: true, name: true, email: true, studentId: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json({ assignments, courses });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { courseCode, title, dueDate, targetStudentEmail } = body;

    if (!courseCode || !title || !dueDate) {
      return NextResponse.json({ error: "Course code, title, and due date are required" }, { status: 400 });
    }

    const course = await prisma.course.findUnique({ where: { code: courseCode } });
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (user.role === "TEACHER" && course.teacherId !== user.id) {
      return NextResponse.json({ error: "Permission denied for this course" }, { status: 403 });
    }

    // Find students enrolled in this course or assign to all enrolled
    let targetUsers = [];
    if (targetStudentEmail) {
      const target = await prisma.user.findUnique({ where: { email: targetStudentEmail } });
      if (target) targetUsers.push(target);
    } else {
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId: course.id },
        include: { user: true },
      });
      targetUsers = enrollments.map((e) => e.user);
    }

    if (!targetUsers.length) {
      // Fallback: assign to all students if no explicit enrollments
      targetUsers = await prisma.user.findMany({ where: { role: "STUDENT" }, take: 10 });
    }

    const due = new Date(dueDate);

    const createdTasks = await Promise.all(
      targetUsers.map((u) =>
        prisma.assignmentTask.create({
          data: {
            userId: u.id,
            courseCode: course.code,
            title,
            dueDate: due,
            status: "PENDING",
          },
        })
      )
    );

    // Notify students via real-time mesh pulse
    const meshEvent = {
      id: createdTasks[0]?.id || `assign-${Date.now()}`,
      type: "ASSIGNMENT",
      title: `New Assignment: ${title}`,
      body: `${course.code} assignment assigned. Due on ${due.toLocaleDateString("en-IN")}.`,
      courseCode: course.code,
      location: course.location,
      authorName: user.name,
      createdAt: new Date().toISOString(),
    };
    publishMeshEvent(meshEvent);

    return NextResponse.json({ success: true, count: createdTasks.length, assignment: createdTasks[0] });
  } catch (err) {
    console.error("Error creating assignment:", err);
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}
