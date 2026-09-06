import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");

  const materials = await prisma.courseMaterial.findMany({
    where: courseId ? { courseId } : {},
    include: { course: { select: { code: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ materials });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { courseId, title, fileName, fileType, textContent } = body;

    if (!courseId || !title || !fileName) {
      return NextResponse.json({ error: "Course ID, title, and file name are required" }, { status: 400 });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const material = await prisma.courseMaterial.create({
      data: {
        courseId: course.id,
        title,
        fileName,
        fileType: fileType || "document",
        extractedText: textContent || `Reference text material for ${title} (${course.code}).`,
      },
    });

    return NextResponse.json({ success: true, material });
  } catch (err) {
    console.error("Error uploading material:", err);
    return NextResponse.json({ error: "Failed to upload course material" }, { status: 500 });
  }
}
