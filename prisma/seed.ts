import { readFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { publishMeshEvent } from "../src/lib/mesh";

const prisma = new PrismaClient();

async function main() {
  await prisma.chatMessage.deleteMany();
  await prisma.campusUpdate.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.feeInvoice.deleteMany();
  await prisma.gradeRecord.deleteMany();
  await prisma.assignmentTask.deleteMany();
  await prisma.hostelAllocation.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.uploadedFile.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  const teacherHash = await bcrypt.hash("Teacher123!", 12);
  const studentHash = await bcrypt.hash("Student123!", 12);
  const adminHash = await bcrypt.hash("Admin123!", 12);

  const teacher = await prisma.user.create({
    data: {
      email: "teacher@lpu.in",
      name: "Dr. Meera Kapoor",
      passwordHash: teacherHash,
      role: "TEACHER",
      department: "CSE",
    },
  });

  const student = await prisma.user.create({
    data: {
      email: "student@lpu.in",
      name: "Aarav Singh",
      passwordHash: studentHash,
      role: "STUDENT",
      department: "CSE",
      studentId: "1220XXXX",
    },
  });

  await prisma.user.create({
    data: {
      email: "admin@lpu.in",
      name: "Campus Admin",
      passwordHash: adminHash,
      role: "ADMIN",
      department: "IT Services",
    },
  });

  const courseDefs = [
    {
      code: "CSE301",
      name: "Data Structures & Algorithms",
      description: "Core DSA with labs",
      location: "Block 34 Room 210",
      building: "Block 34",
      room: "Room 210",
      schedule: "Mon/Wed 10:00–11:30",
      dayOfWeek: "Mon/Wed",
      startTime: "10:00",
      endTime: "11:30",
    },
    {
      code: "DSA201",
      name: "Discrete Mathematics",
      location: "Block 29 Hall A",
      building: "Block 29",
      room: "Hall A",
      schedule: "Tue/Thu 14:00–15:30",
      dayOfWeek: "Tue/Thu",
      startTime: "14:00",
      endTime: "15:30",
    },
    {
      code: "CSE401",
      name: "Operating Systems",
      location: "Block 38 Room 102",
      building: "Block 38",
      room: "Room 102",
      schedule: "Mon/Wed 12:00–13:30",
      dayOfWeek: "Mon/Wed",
      startTime: "12:00",
      endTime: "13:30",
    },
    {
      code: "INT305",
      name: "Database Management Systems",
      location: "Block 33 Lab 4",
      building: "Block 33",
      room: "Lab 4",
      schedule: "Tue/Fri 09:00–10:30",
      dayOfWeek: "Tue/Fri",
      startTime: "09:00",
      endTime: "10:30",
    },
    {
      code: "ENG101",
      name: "Communication Skills",
      location: "Block 14 Room 05",
      building: "Block 14",
      room: "Room 05",
      schedule: "Thu 11:00–12:30",
      dayOfWeek: "Thu",
      startTime: "11:00",
      endTime: "12:30",
    },
    {
      code: "CSE310",
      name: "Computer Networks",
      location: "Block 34 Room 305",
      building: "Block 34",
      room: "Room 305",
      schedule: "Wed/Fri 15:00–16:30",
      dayOfWeek: "Wed/Fri",
      startTime: "15:00",
      endTime: "16:30",
    },
  ] as const;

  const courses = [];
  for (const def of courseDefs) {
    courses.push(
      await prisma.course.create({
        data: { ...def, teacherId: teacher.id },
      })
    );
  }

  await prisma.enrollment.createMany({
    data: courses.map((c) => ({ userId: student.id, courseId: c.id })),
  });

  const cse301 = courses.find((c) => c.code === "CSE301")!;
  const int305 = courses.find((c) => c.code === "INT305")!;
  const cse310 = courses.find((c) => c.code === "CSE310")!;

  // Simulate a mid-class venue change already in DB
  await prisma.course.update({
    where: { id: cse301.id },
    data: {
      location: "Block 38 Room 401",
      building: "Block 38",
      room: "Room 401",
    },
  });

  const updates = [
    await prisma.campusUpdate.create({
      data: {
        courseId: cse301.id,
        authorId: teacher.id,
        type: "LOCATION",
        title: "CSE301 relocated (live)",
        body: "CSE301 moved from Block 34 Room 210 to Block 38 Room 401 for today's session.",
        location: "Block 38 Room 401",
        building: "Block 38",
        room: "Room 401",
      },
    }),
    await prisma.campusUpdate.create({
      data: {
        courseId: int305.id,
        authorId: teacher.id,
        type: "ANNOUNCEMENT",
        title: "INT305 · bring ER diagrams",
        body: "Bring printed ER diagrams for the lab review tomorrow.",
        location: int305.location,
      },
    }),
    await prisma.campusUpdate.create({
      data: {
        courseId: cse310.id,
        authorId: teacher.id,
        type: "SCHEDULE",
        title: "CSE310 timing note",
        body: "Friday slot starts 10 minutes early this week for quiz setup.",
        location: cse310.location,
      },
    }),
  ];

  for (const u of updates) {
    const course = courses.find((c) => c.id === u.courseId);
    publishMeshEvent({
      id: u.id,
      type: u.type,
      title: u.title,
      body: u.body,
      courseCode: course?.code ?? null,
      location: u.location,
      authorName: teacher.name,
      createdAt: u.createdAt.toISOString(),
    });
  }

  // Seed sample documents students can ask about after uploading
  const sampleFiles = [
    {
      name: "cse301-lab-brief.txt",
      mime: "text/plain",
      kind: "document",
      rel: path.join("data", "samples", "cse301-lab-brief.txt"),
    },
    {
      name: "int305-notes.md",
      mime: "text/markdown",
      kind: "document",
      rel: path.join("data", "samples", "int305-notes.md"),
    },
  ];

  for (const sample of sampleFiles) {
    const abs = path.join(process.cwd(), sample.rel);
    const text = await readFile(abs, "utf8");
    await prisma.uploadedFile.create({
      data: {
        userId: student.id,
        filename: sample.name,
        mimeType: sample.mime,
        size: Buffer.byteLength(text),
        kind: sample.kind,
        storagePath: sample.rel,
        extractedText: text,
      },
    });
  }

  // —— Mock University ERP ——
  const attendanceSeed = [
    { code: "CSE301", present: 28, total: 34 },
    { code: "DSA201", present: 30, total: 32 },
    { code: "CSE401", present: 22, total: 30 },
    { code: "INT305", present: 26, total: 28 },
    { code: "ENG101", present: 14, total: 16 },
    { code: "CSE310", present: 18, total: 24 },
  ];
  for (const a of attendanceSeed) {
    const course = courses.find((c) => c.code === a.code);
    if (!course) continue;
    await prisma.attendanceRecord.create({
      data: {
        userId: student.id,
        courseId: course.id,
        present: a.present,
        total: a.total,
      },
    });
  }

  await prisma.feeInvoice.createMany({
    data: [
      {
        userId: student.id,
        term: "2026 Spring",
        category: "tuition",
        amountInr: 85000,
        paidInr: 85000,
        status: "PAID",
        dueDate: new Date("2026-01-15"),
      },
      {
        userId: student.id,
        term: "2026 Spring",
        category: "hostel",
        amountInr: 42000,
        paidInr: 20000,
        status: "PARTIAL",
        dueDate: new Date("2026-02-28"),
      },
      {
        userId: student.id,
        term: "2026 Spring",
        category: "exam",
        amountInr: 3500,
        paidInr: 0,
        status: "DUE",
        dueDate: new Date("2026-03-10"),
      },
    ],
  });

  const gradeSeed = [
    { code: "CSE301", grade: "A", marks: 86 },
    { code: "DSA201", grade: "A+", marks: 92 },
    { code: "ENG101", grade: "B+", marks: 78 },
  ];
  for (const g of gradeSeed) {
    const course = courses.find((c) => c.code === g.code);
    if (!course) continue;
    await prisma.gradeRecord.create({
      data: {
        userId: student.id,
        courseId: course.id,
        term: "2025 Fall",
        grade: g.grade,
        marks: g.marks,
        credits: 3,
      },
    });
  }

  await prisma.hostelAllocation.create({
    data: {
      userId: student.id,
      block: "BH-3",
      room: "214",
      bed: "A",
      warden: "Mr. Rakesh Verma",
      status: "ACTIVE",
    },
  });

  const soon = new Date();
  soon.setDate(soon.getDate() + 2);
  const later = new Date();
  later.setDate(later.getDate() + 5);

  await prisma.assignmentTask.createMany({
    data: [
      {
        userId: student.id,
        courseCode: "CSE301",
        title: "DSA Lab Report — Graphs",
        dueDate: soon,
        status: "PENDING",
      },
      {
        userId: student.id,
        courseCode: "CSE310",
        title: "OS Project Checkpoint",
        dueDate: later,
        status: "PENDING",
      },
      {
        userId: student.id,
        courseCode: "INT305",
        title: "DBMS ER Diagram Submission",
        dueDate: new Date(Date.now() - 2 * 86400000),
        status: "PENDING",
      },
    ],
  });

  // —— Public Knowledge Layer ——
  await prisma.building.deleteMany();
  await prisma.facultyMember.deleteMany();
  await prisma.campusEvent.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.club.deleteMany();

  await prisma.building.createMany({
    data: [
      {
        name: "Block 13",
        block: "13",
        description: "Academic block near central campus with lecture halls and faculty offices.",
        facilities: JSON.stringify(["Lecture Halls", "Faculty Offices", "Wi-Fi"]),
        lat: 31.2582,
        lng: 75.7088,
      },
      {
        name: "Block 29",
        block: "29",
        description: "Engineering block with large lecture halls and seminar rooms.",
        facilities: JSON.stringify(["Lecture Halls", "Seminar Rooms"]),
        lat: 31.2565,
        lng: 75.7042,
      },
      {
        name: "Block 33",
        block: "33",
        description: "Computer labs and practical classrooms for CSE and IT.",
        facilities: JSON.stringify(["Computer Labs", "Project Rooms"]),
        lat: 31.2542,
        lng: 75.7078,
      },
      {
        name: "Block 34",
        block: "34",
        description: "CSE & IT department hub with classrooms and faculty offices.",
        facilities: JSON.stringify(["Classrooms", "Faculty Offices", "Labs"]),
        lat: 31.2535,
        lng: 75.7048,
      },
      {
        name: "Block 38",
        block: "38",
        description: "Engineering block with advanced labs and project spaces.",
        facilities: JSON.stringify(["Engineering Labs", "Project Rooms", "Wi-Fi"]),
        lat: 31.2578,
        lng: 75.7025,
      },
    ],
  });

  await prisma.facultyMember.createMany({
    data: [
      {
        name: "Dr. Meera Kapoor",
        department: "CSE",
        designation: "Professor",
        email: "meera.kapoor@lpu.in",
        specialization: "Data Structures & Algorithms",
      },
      {
        name: "Dr. Rajesh Kumar",
        department: "CSE",
        designation: "Associate Professor",
        email: "rajesh.kumar@lpu.in",
        specialization: "Operating Systems",
      },
      {
        name: "Dr. Priya Sharma",
        department: "CSE",
        designation: "Assistant Professor",
        email: "priya.sharma@lpu.in",
        specialization: "Database Management Systems",
      },
      {
        name: "Dr. Amit Verma",
        department: "Mathematics",
        designation: "Professor",
        email: "amit.verma@lpu.in",
        specialization: "Discrete Mathematics",
      },
      {
        name: "Dr. Sunita Rao",
        department: "English",
        designation: "Associate Professor",
        email: "sunita.rao@lpu.in",
        specialization: "Technical Communication",
      },
    ],
  });

  const now = new Date();
  await prisma.campusEvent.createMany({
    data: [
      {
        title: "Tech Fest 2026 — Code Rush",
        description: "Annual coding competition with hackathon, workshops, and tech talks.",
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7),
        time: "10:00 AM – 6:00 PM",
        location: "Block 38, Main Auditorium",
        category: "Tech",
      },
      {
        title: "Cultural Night — Rhythms of LPU",
        description: "Music, dance, and cultural performances by student clubs.",
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14),
        time: "6:00 PM – 10:00 PM",
        location: "Open Air Theatre",
        category: "Cultural",
      },
      {
        title: "Placement Drive — TCS",
        description: "On-campus placement drive for B.Tech CSE and IT students.",
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 21),
        time: "9:00 AM – 5:00 PM",
        location: "Block 29, Seminar Hall",
        category: "Placement",
      },
      {
        title: "Guest Lecture — AI in Industry",
        description: "Industry expert talk on practical applications of AI and ML.",
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3),
        time: "2:00 PM – 4:00 PM",
        location: "Block 34, Room 210",
        category: "Academic",
      },
    ],
  });

  await prisma.notice.createMany({
    data: [
      {
        title: "Mid-Semester Exam Schedule Released",
        body: "The mid-semester examination schedule for Spring 2026 is now available. Check your course portal for dates and room allocations.",
        category: "Exams",
        priority: "high",
      },
      {
        title: "Library Extended Hours",
        body: "Central Library will remain open until 11 PM during exam week. Quiet study zones available on all floors.",
        category: "Library",
        priority: "normal",
      },
      {
        title: "Hostel Fee Deadline",
        body: "Remaining hostel fees for Spring 2026 must be cleared by March 15. Visit the accounts office or pay online.",
        category: "Fees",
        priority: "urgent",
      },
      {
        title: "Campus Wi-Fi Maintenance",
        body: "Network maintenance scheduled on Sunday 2 AM–6 AM. Brief connectivity interruptions expected in academic blocks.",
        category: "IT",
        priority: "low",
      },
    ],
  });

  await prisma.club.createMany({
    data: [
      {
        name: "Code Warriors",
        description: "Programming and competitive coding club.",
        category: "Tech",
        contact: "codewarriors@lpu.in",
      },
      {
        name: "LPU Dance Crew",
        description: "Dance performances and choreography workshops.",
        category: "Cultural",
        contact: "dancecrew@lpu.in",
      },
      {
        name: "Entrepreneurship Cell",
        description: "Startup incubation and business networking.",
        category: "Business",
        contact: "e-cell@lpu.in",
      },
    ],
  });

  console.log("Seeded LPUGPT sample campus DB + mock ERP + public knowledge.");
  console.log("teacher@lpu.in / Teacher123!");
  console.log("student@lpu.in / Student123!");
  console.log("admin@lpu.in / Admin123!");
  console.log("Try: 'What's my attendance?', 'Any fee dues?', 'Show my results', 'Hostel details'");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
