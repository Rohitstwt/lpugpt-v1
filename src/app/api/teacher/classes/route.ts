import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publishMeshEvent } from "@/lib/mesh";

export async function GET(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const courses = await prisma.course.findMany({
      where: user.role === "ADMIN" ? {} : { teacherId: user.id },
      include: {
        enrollments: { select: { id: true } },
        updates: { orderBy: { createdAt: "desc" }, take: 5 },
      },
      orderBy: { code: "asc" },
    });

    return NextResponse.json({ courses });
  } catch (err) {
    console.error("Error fetching teacher courses:", err);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { courseId, location, building, room, schedule, note } = body;

    if (!courseId || (!location && !schedule)) {
      return NextResponse.json({ error: "Course ID and new location or schedule required" }, { status: 400 });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (user.role === "TEACHER" && course.teacherId !== user.id) {
      return NextResponse.json({ error: "Permission denied for this course" }, { status: 403 });
    }

    const prevLocation = course.location;
    const prevSchedule = course.schedule;

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        ...(location ? { location } : {}),
        ...(building !== undefined ? { building } : {}),
        ...(room !== undefined ? { room } : {}),
        ...(schedule ? { schedule } : {}),
      },
    });

    const updateTitle = location && schedule 
      ? `${course.code} Location & Schedule Change`
      : location ? `${course.code} Venue Changed` : `${course.code} Schedule Updated`;

    const updateBody = location 
      ? `${course.code} moved from "${prevLocation}" to "${location}". ${note ? `Note: ${note}` : ""}`
      : `${course.code} schedule updated from "${prevSchedule}" to "${schedule}".`;

    const campusUpdate = await prisma.campusUpdate.create({
      data: {
        courseId: course.id,
        authorId: user.id,
        type: location ? "LOCATION" : "SCHEDULE",
        title: updateTitle,
        body: updateBody,
        location: location || course.location,
        building: building || course.building,
        room: room || course.room,
        metadata: JSON.stringify({ prevLocation, prevSchedule, note }),
      },
    });

    // Real-time SSE Broadcast to all enrolled students
    const meshEvent = {
      id: campusUpdate.id,
      type: location ? "LOCATION" : "SCHEDULE",
      title: campusUpdate.title,
      body: campusUpdate.body,
      courseCode: course.code,
      location: location || course.location,
      authorName: user.name,
      createdAt: campusUpdate.createdAt.toISOString(),
    };
    publishMeshEvent(meshEvent);

    return NextResponse.json({ success: true, course: updatedCourse, meshEvent });
  } catch (err) {
    console.error("Error updating class:", err);
    return NextResponse.json({ error: "Failed to update class details" }, { status: 500 });
  }
}
