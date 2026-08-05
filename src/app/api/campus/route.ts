import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [events, notices, buildings, faculty] = await Promise.all([
    prisma.campusEvent.findMany({
      where: { date: { gte: new Date() } },
      orderBy: { date: "asc" },
      take: 6,
    }),
    prisma.notice.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.building.findMany({ take: 8 }),
    prisma.facultyMember.findMany({ take: 4 }),
  ]);

  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      date: e.date.toISOString(),
      time: e.time,
      location: e.location,
      category: e.category,
    })),
    notices: notices.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      category: n.category,
      priority: n.priority,
      createdAt: n.createdAt.toISOString(),
    })),
    buildings: buildings.map((b) => ({
      id: b.id,
      name: b.name,
      block: b.block,
      description: b.description,
    })),
    faculty: faculty.map((f) => ({
      id: f.id,
      name: f.name,
      department: f.department,
      designation: f.designation,
    })),
  });
}
