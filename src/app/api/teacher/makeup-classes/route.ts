import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publishMeshEvent } from "@/lib/mesh";

export async function GET(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");

  const makeupClasses = await prisma.makeupClass.findMany({
    where: courseId ? { courseId } : {},
    include: { course: { select: { code: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ makeupClasses });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { courseId, topic, date, timeSlot, location, reason } = body;

    if (!courseId || !topic || !date || !timeSlot || !location) {
      return NextResponse.json(
        { error: "Course, topic, date, time slot, and location are required" },
        { status: 400 }
      );
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (user.role === "TEACHER" && course.teacherId !== user.id) {
      return NextResponse.json({ error: "Permission denied for this course" }, { status: 403 });
    }

    const makeup = await prisma.makeupClass.create({
      data: {
        courseId: course.id,
        topic,
        date,
        timeSlot,
        location,
        reason: reason || "Extra compensatory lecture",
        status: "SCHEDULED",
      },
    });

    // Create a public campus update record
    const campusUpdate = await prisma.campusUpdate.create({
      data: {
        courseId: course.id,
        authorId: user.id,
        type: "MAKEUP_CLASS",
        title: `Makeup Class: ${course.code} (${topic})`,
        body: `Compensatory session scheduled on ${date} at ${timeSlot} in ${location}. ${reason ? `Reason: ${reason}` : ""}`,
        location,
      },
    });

    // Real-time SSE Broadcast to all enrolled students
    const meshEvent = {
      id: campusUpdate.id,
      type: "MAKEUP_CLASS",
      title: campusUpdate.title,
      body: campusUpdate.body,
      courseCode: course.code,
      location,
      authorName: user.name,
      createdAt: campusUpdate.createdAt.toISOString(),
    };
    publishMeshEvent(meshEvent);

    return NextResponse.json({ success: true, makeupClass: makeup, meshEvent });
  } catch (err) {
    console.error("Error scheduling makeup class:", err);
    return NextResponse.json({ error: "Failed to schedule makeup class" }, { status: 500 });
  }
}
