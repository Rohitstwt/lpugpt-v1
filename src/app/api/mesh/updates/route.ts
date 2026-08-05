import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const where =
    user.role === "ADMIN"
      ? {}
      : user.role === "TEACHER"
        ? {
            OR: [{ authorId: user.id }, { course: { teacherId: user.id } }],
          }
        : {
            course: { enrollments: { some: { userId: user.id } } },
          };

  const updates = await prisma.campusUpdate.findMany({
    where,
    include: {
      course: { select: { code: true, name: true } },
      author: { select: { name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({ updates });
}
