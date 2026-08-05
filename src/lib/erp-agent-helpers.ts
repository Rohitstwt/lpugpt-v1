import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function accessibleCoursesForAgent(user: SessionUser) {
  if (user.role === "ADMIN") {
    return prisma.course.findMany({ orderBy: { code: "asc" } });
  }
  if (user.role === "TEACHER") {
    return prisma.course.findMany({
      where: { teacherId: user.id },
      orderBy: { code: "asc" },
    });
  }
  return prisma.course.findMany({
    where: { enrollments: { some: { userId: user.id } } },
    orderBy: { code: "asc" },
  });
}
