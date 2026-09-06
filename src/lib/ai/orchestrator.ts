import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { retrieveKnowledge } from "@/lib/ai/rag";
import { ensureDemoAssignments } from "@/lib/ai/mock-ums-agent";
import {
  buildCgpaRows,
  calcAttendanceRow,
  classifyCgpa,
  gradeToPoint,
  LPU_ATTENDANCE_MIN,
} from "@/lib/academic/lpu-rules";
import {
  computeRoute,
  fetchGoogleDirections,
  searchNearby,
} from "@/lib/maps/google-maps";
import { CAMPUS_BLOCKS, listCampusPlaces, resolveLocation } from "@/lib/maps/campus-coordinates";
import type { ChatResponse, Citation, UIBlock } from "@/types/ui-blocks";

export type OrchestratorResult = ChatResponse & { reply: string };

function extractRouteQuery(message: string): { from: string; to: string } | null {
  const patterns = [
    /(?:from|go from)\s+(.+?)\s+(?:to|→)\s+(.+)/i,
    /how\s+(?:do\s+i\s+)?(?:get|go)\s+(?:from\s+)?(.+?)\s+to\s+(.+)/i,
    /route\s+(?:from\s+)?(.+?)\s+to\s+(.+)/i,
    /(.+?)\s+to\s+(.+?)(?:\?|$)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return { from: match[1].trim(), to: match[2].trim().replace(/\?$/, "") };
    }
  }
  return null;
}

function detectIntent(message: string): string {
  const lower = message.toLowerCase();
  if (
    /\b(campus map|university map|show (me )?(the )?map|open (the )?map|navigate campus|campus navigation|explore campus)\b/i.test(
      lower
    )
  )
    return "CAMPUS_MAP";
  if (extractRouteQuery(message)) return "NAVIGATION";
  if (/\b(block|building)\s*\d+/i.test(lower) || /\bwhere is\b/i.test(lower))
    return "BUILDING";
  if (/\b(faculty|professor|teacher|dr\.|hod)\b/i.test(lower)) return "FACULTY";
  if (/\b(event|festival|hackathon|seminar|workshop)\b/i.test(lower)) return "EVENTS";
  if (/\b(notice|announcement|news)\b/i.test(lower)) return "NOTICES";
  if (/\b(hostel|warden|room allotment)\b/i.test(lower)) return "HOSTEL";
  if (/\b(library|books|journal)\b/i.test(lower)) return "LIBRARY";
  if (/\b(nearby|near|atm|restaurant|food|hospital|parking)\b/i.test(lower))
    return "NEARBY";
  if (/\b(attendance|present|absent|bunk|can i miss|how many.*miss)\b/i.test(lower))
    return "ATTENDANCE";
  if (/\b(fee|fees|dues?|invoice)\b/i.test(lower)) return "FEES";
  if (
    /\b(cgpa|sgpa|gpa calculator|calculate (my )?(cgpa|gpa|sgpa))\b/i.test(lower)
  )
    return "CGPA";
  if (
    /\b(analyse|analyze|analysis|graph|graphs|chart|charts|visuali[sz]e)\b/i.test(
      lower
    ) &&
    /\b(result|results|grade|grades|marks|attendance|score)\b/i.test(lower)
  )
    return "RESULTS_CHARTS";
  if (/\b(result|results|grade|grades|marks|gpa|cgpa|transcript|scorecard)\b/i.test(lower))
    return "GRADES";
  if (/\b(project|projects|mini[- ]?project)\b/i.test(lower)) return "PROJECTS";
  if (/\b(lab reports?|reports?)\b/i.test(lower) && !/\b(bug|issue|news)\b/i.test(lower))
    return "REPORTS";
  if (/\b(assignment|assignments|homework|coursework|submission|submissions)\b/i.test(lower))
    return "ASSIGNMENTS";
  if (/\b(timetable|schedule|classes today)\b/i.test(lower)) return "TIMETABLE";
  if (/\b(lpu|campus|university)\b/i.test(lower)) return "CAMPUS";
  return "GENERAL";
}

function clipText(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function citationsFromRag(
  hits: Awaited<ReturnType<typeof retrieveKnowledge>>
): Citation[] {
  return hits.slice(0, 2).map((h) => ({
    id: h.doc.id,
    title: h.doc.title,
    source: h.doc.source,
    snippet: clipText(h.doc.text, 90),
  }));
}

async function handleNavigation(message: string): Promise<UIBlock[]> {
  const routeQuery = extractRouteQuery(message);
  if (!routeQuery) return [];

  let route = computeRoute(routeQuery.from, routeQuery.to);

  if (route?.fromLat && route?.toLat) {
    const googleRoute = await fetchGoogleDirections(
      route.fromLat,
      route.fromLng!,
      route.toLat,
      route.toLng!
    );
    if (googleRoute) route = { ...route, ...googleRoute, fromLat: route.fromLat, fromLng: route.fromLng, toLat: route.toLat, toLng: route.toLng };
  }

  if (!route) {
    return [
      {
        type: "text",
        content:
          "I could not locate those places on campus. Please try specific locations such as Block 38, the library, hostel, or food court.",
      },
      ...(await handleCampusMap()).filter((b) => b.type !== "text"),
    ];
  }

  const fromPlace = resolveLocation(routeQuery.from);
  const toPlace = resolveLocation(routeQuery.to);
  const places = listCampusPlaces();
  const fromId = places.find((p) => p.name === fromPlace?.name)?.id;
  const toId = places.find((p) => p.name === toPlace?.name)?.id;

  return [
    {
      type: "campus_nav",
      data: {
        places,
        fromId,
        toId,
      },
    },
  ];
}

async function handleCampusMap(): Promise<UIBlock[]> {
  return [
    {
      type: "campus_nav",
      data: {
        places: listCampusPlaces(),
      },
    },
  ];
}

async function handleBuilding(message: string): Promise<UIBlock[]> {
  const blockMatch = message.match(/\bblock\s*(\d+)\b/i);
  const blockNum = blockMatch?.[1];

  if (blockNum && CAMPUS_BLOCKS[blockNum]) {
    const b = CAMPUS_BLOCKS[blockNum];
    const dbBuilding = await prisma.building.findFirst({
      where: { block: blockNum },
    });

    return [
      {
        type: "building_card",
        data: {
          id: dbBuilding?.id,
          name: dbBuilding?.name ?? b.name,
          block: `Block ${blockNum}`,
          description: dbBuilding?.description ?? b.description,
          facilities: dbBuilding?.facilities
            ? JSON.parse(dbBuilding.facilities)
            : undefined,
          lat: b.lat,
          lng: b.lng,
        },
      },
      {
        type: "campus_map",
        data: {
          centerLat: b.lat,
          centerLng: b.lng,
          zoom: 18,
          markers: [{ lat: b.lat, lng: b.lng, label: b.name }],
        },
      },
    ];
  }

  const buildings = await prisma.building.findMany({ take: 5 });
  if (buildings.length) {
    return buildings.map((b) => ({
      type: "building_card" as const,
      data: {
        id: b.id,
        name: b.name,
        block: b.block ? `Block ${b.block}` : undefined,
        description: b.description ?? undefined,
        facilities: b.facilities ? JSON.parse(b.facilities) : undefined,
        lat: b.lat ?? undefined,
        lng: b.lng ?? undefined,
      },
    }));
  }

  return [];
}

async function handleFaculty(message: string): Promise<UIBlock[]> {
  const nameMatch = message.match(/(?:dr\.?\s*|prof\.?\s*)([a-z\s]+)/i);
  const searchName = nameMatch?.[1]?.trim();

  const faculty = searchName
    ? await prisma.facultyMember.findMany({
        where: { name: { contains: searchName } },
        take: 5,
      })
    : await prisma.facultyMember.findMany({ take: 6 });

  if (!faculty.length) {
    return [
      {
        type: "text",
        content:
          "I couldn't find faculty matching that query. Try a name or department like **CSE** or **Dr. Kapoor**.",
      },
    ];
  }

  return faculty.map((f) => ({
    type: "faculty_card" as const,
    data: {
      id: f.id,
      name: f.name,
      department: f.department ?? undefined,
      designation: f.designation ?? undefined,
      email: f.email ?? undefined,
      specialization: f.specialization ?? undefined,
    },
  }));
}

async function handleEvents(): Promise<UIBlock[]> {
  const events = await prisma.campusEvent.findMany({
    where: { date: { gte: new Date() } },
    orderBy: { date: "asc" },
    take: 6,
  });

  if (!events.length) {
    return [
      {
        type: "text",
        content: "There are no upcoming events listed at this time.",
      },
    ];
  }

  return events.map((e) => ({
    type: "event_card" as const,
    data: {
      id: e.id,
      title: e.title,
      date: e.date.toLocaleDateString("en-IN", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      time: e.time ?? undefined,
      location: e.location ?? undefined,
      description: e.description ?? undefined,
      category: e.category ?? undefined,
    },
  }));
}

async function handleNotices(): Promise<UIBlock[]> {
  const notices = await prisma.notice.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  if (!notices.length) {
    return [{ type: "text", content: "There are no recent notices at this time." }];
  }

  return notices.map((n) => ({
    type: "notice_card" as const,
    data: {
      id: n.id,
      title: n.title,
      body: n.body,
      date: n.createdAt.toLocaleDateString("en-IN"),
      category: n.category ?? undefined,
      priority: (n.priority as "low" | "normal" | "high" | "urgent") ?? "normal",
    },
  }));
}

async function handleNearby(message: string): Promise<UIBlock[]> {
  const places = searchNearby(message);
  return [
    {
      type: "nearby_places",
      data: {
        query: message,
        places: places.map((p) => ({
          name: p.name,
          type: p.type,
          distance: p.distance,
          lat: p.lat,
          lng: p.lng,
        })),
      },
    },
  ];
}

async function handleRag(message: string): Promise<UIBlock[]> {
  const hits = await retrieveKnowledge(message, 3);
  const citations = citationsFromRag(hits);

  if (!hits.length) {
    return [
      {
        type: "text",
        content:
          "I don't have specific information on that in my public knowledge base. Try asking about campus blocks, events, faculty, or navigation.",
      },
    ];
  }

  // One tight answer from the best hit — not a dump of every doc.
  const summary = clipText(hits[0].doc.text, 220);

  return [
    {
      type: "text",
      content: summary,
      citations,
    },
    {
      type: "sources_card",
      data: { sources: citations },
    },
  ];
}

async function handleAttendance(user: SessionUser): Promise<UIBlock[]> {
  const records = await prisma.attendanceRecord.findMany({
    where: { userId: user.id },
    include: { course: true },
    take: 12,
  });

  if (!records.length) {
    return [
      {
        type: "text",
        content:
          "No attendance records found. Sign in with a student account to view attendance.",
      },
    ];
  }

  const calcRows = records.map((r) =>
    calcAttendanceRow(r.course.code, r.present, r.total, r.course.name)
  );

  const atRisk = calcRows.filter((r) => r.status !== "eligible").length;

  return [
    {
      type: "text",
        content:
          atRisk > 0
            ? `${atRisk} course(s) are below the ${LPU_ATTENDANCE_MIN}% attendance requirement.`
            : `All courses meet the ${LPU_ATTENDANCE_MIN}% attendance requirement.`,
    },
    {
      type: "attendance_calc_card",
      data: {
        minPercent: LPU_ATTENDANCE_MIN,
        rows: calcRows,
      },
    },
    {
      type: "quick_actions",
      data: {
        actions: [
          { label: "CGPA", query: "Calculate my CGPA" },
          { label: "Charts", query: "Analyse my results with graphs" },
        ],
      },
    },
  ];
}

async function handleFees(user: SessionUser): Promise<UIBlock[]> {
  const invoices = await prisma.feeInvoice.findMany({
    where: { userId: user.id },
    orderBy: { dueDate: "asc" },
  });

  if (!invoices.length) {
    return [{ type: "text", content: "No fee records found for your account." }];
  }

  const totalDue = invoices.reduce(
    (sum, inv) => sum + (inv.amountInr - inv.paidInr),
    0
  );

  return [
    {
      type: "text",
      content:
        totalDue > 0
          ? `You have ₹${totalDue.toLocaleString("en-IN")} outstanding.`
          : "Your fee balance is clear.",
    },
    {
      type: "fee_card",
      data: {
        totalDue,
        invoices: invoices.map((inv) => ({
          id: inv.id,
          term: inv.term,
          category: inv.category,
          amountInr: inv.amountInr,
          paidInr: inv.paidInr,
          status: inv.status,
          dueDate: inv.dueDate.toLocaleDateString("en-IN"),
        })),
      },
    },
  ];
}

function dueLabel(d: Date) {
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

function taskKind(title: string): "assignment" | "project" | "report" | "lab" {
  const t = title.toLowerCase();
  if (/\bproject\b/.test(t)) return "project";
  if (/\breport\b/.test(t)) return "report";
  if (/\blab\b/.test(t)) return "lab";
  return "assignment";
}

async function resolveStudentId(user: SessionUser) {
  if (user.role === "ADMIN") {
    return (
      (await prisma.user.findFirst({ where: { email: "student@lpu.in" } }))
        ?.id ?? user.id
    );
  }
  return user.id;
}

async function loadGradeRows(user: SessionUser) {
  const studentId = await resolveStudentId(user);
  return prisma.gradeRecord.findMany({
    where: { userId: studentId },
    include: { course: true },
    orderBy: [{ term: "desc" }, { course: { code: "asc" } }],
  });
}

function chartsFromGrades(
  rows: Awaited<ReturnType<typeof loadGradeRows>>,
  attendance?: { courseCode: string; percentage: number }[]
): UIBlock {
  const gradeDistMap = new Map<string, number>();
  for (const r of rows) {
    gradeDistMap.set(r.grade, (gradeDistMap.get(r.grade) || 0) + 1);
  }

  return {
    type: "results_charts_card",
    data: {
      title: "Results analysis",
      marks: rows
        .filter((r) => r.marks != null)
        .map((r) => ({
          courseCode: r.course.code,
          courseName: r.course.name,
          marks: r.marks as number,
          grade: r.grade,
        })),
      gradeDist: [...gradeDistMap.entries()].map(([grade, count]) => ({
        grade,
        count,
      })),
      gradePoints: rows.map((r) => ({
        courseCode: r.course.code,
        gradePoint: gradeToPoint(r.grade),
      })),
      attendance,
    },
  };
}

async function handleGrades(user: SessionUser): Promise<UIBlock[]> {
  const rows = await loadGradeRows(user);

  if (!rows.length) {
    return [
      {
        type: "text",
        content:
          "No marks are available in Mock UMS yet. Results will appear here once they are published.",
      },
    ];
  }

  const term = rows[0]?.term;
  const { sgpa } = buildCgpaRows(
    rows.map((r) => ({
      courseCode: r.course.code,
      courseName: r.course.name,
      grade: r.grade,
      marks: r.marks,
      credits: r.credits,
      term: r.term,
    }))
  );

  return [
    {
      type: "text",
      content: `Your SGPA is ${sgpa.toFixed(2)}.`,
    },
    {
      type: "grades_card",
      data: {
        term,
        gpaHint: `SGPA ${sgpa.toFixed(2)}`,
        rows: rows.map((r) => ({
          courseCode: r.course.code,
          courseName: r.course.name,
          grade: r.grade,
          marks: r.marks,
          credits: r.credits,
          term: r.term,
        })),
      },
    },
    {
      type: "quick_actions",
      data: {
        actions: [
          { label: "CGPA", query: "Calculate my CGPA" },
          { label: "Charts", query: "Analyse my results with graphs" },
        ],
      },
    },
  ];
}

async function handleCgpa(user: SessionUser): Promise<UIBlock[]> {
  const rows = await loadGradeRows(user);
  if (!rows.length) {
    return [
      {
        type: "text",
        content: "No grades are available in Mock UMS yet. At least one result is required to calculate CGPA.",
      },
    ];
  }

  const { rows: cgpaRows, sgpa, totalCredits } = buildCgpaRows(
    rows.map((r) => ({
      courseCode: r.course.code,
      courseName: r.course.name,
      grade: r.grade,
      marks: r.marks,
      credits: r.credits,
      term: r.term,
    }))
  );
  const band = classifyCgpa(sgpa);
  const term = rows[0]?.term;

  return [
    {
      type: "text",
      content: `Your SGPA is ${sgpa.toFixed(2)} (${band.label}).`,
    },
    {
      type: "cgpa_card",
      data: {
        sgpa,
        totalCredits,
        band: band.label,
        term,
        rows: cgpaRows,
      },
    },
  ];
}

async function handleResultsCharts(user: SessionUser): Promise<UIBlock[]> {
  const rows = await loadGradeRows(user);
  if (!rows.length) {
    return [
      {
        type: "text",
        content: "No results are available to display in Mock UMS yet.",
      },
    ];
  }

  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: { userId: await resolveStudentId(user) },
    include: { course: true },
  });
  const attendance = attendanceRecords.map((r) => ({
    courseCode: r.course.code,
    percentage: Math.round((r.present / r.total) * 1000) / 10,
  }));

  const { sgpa } = buildCgpaRows(
    rows.map((r) => ({
      courseCode: r.course.code,
      grade: r.grade,
      marks: r.marks,
      credits: r.credits,
    }))
  );

  return [
    {
      type: "text",
      content: `Your SGPA is ${sgpa.toFixed(2)}.`,
    },
    chartsFromGrades(rows, attendance),
  ];
}

async function handleAssignments(
  user: SessionUser,
  filter: "all" | "pending" | "projects" | "reports" = "all"
): Promise<UIBlock[]> {
  const studentId = await ensureDemoAssignments(user);

  let tasks = await prisma.assignmentTask.findMany({
    where: { userId: studentId },
    orderBy: { dueDate: "asc" },
  });

  if (filter === "pending") {
    tasks = tasks.filter((t) => t.status === "PENDING");
  } else if (filter === "projects") {
    tasks = tasks.filter((t) => taskKind(t.title) === "project");
  } else if (filter === "reports") {
    tasks = tasks.filter((t) =>
      ["report", "lab"].includes(taskKind(t.title))
    );
  }

  const title =
    filter === "projects"
      ? "Projects"
      : filter === "reports"
        ? "Reports & labs"
        : filter === "pending"
          ? "Pending assignments"
          : "Assignments & coursework";

  if (!tasks.length) {
    return [
      {
        type: "text",
        content:
          filter === "projects"
            ? "No project checkpoints in Mock UMS right now."
            : filter === "reports"
              ? "No lab reports pending in Mock UMS."
              : "No assignments on Mock UMS right now.",
      },
      {
        type: "quick_actions",
        data: {
          actions: [
            {
              label: "Submit assignment",
              query: "submit my assignment before deadline",
              icon: "upload",
            },
            { label: "Marks", query: "Show my marks", icon: "grades" },
          ],
        },
      },
    ];
  }

  const pending = tasks.filter((t) => t.status === "PENDING").length;

  return [
    {
      type: "text",
      content: pending > 0
        ? `You have ${pending} assignment(s) pending submission.`
        : "All assignments have been submitted.",
    },
    {
      type: "assignments_card",
      data: {
        title,
        filter,
        tasks: tasks.map((t) => ({
          id: t.id,
          courseCode: t.courseCode,
          title: t.title,
          dueLabel: dueLabel(t.dueDate),
          status: t.status,
          kind: taskKind(t.title),
          fileName: t.fileName,
        })),
      },
    },
    {
      type: "quick_actions",
      data: {
        actions: [
          {
            label: "Submit",
            query: "submit my assignment before deadline",
          },
        ],
      },
    },
  ];
}

async function handleTimetable(user: SessionUser): Promise<UIBlock[]> {
  const courses = await prisma.course.findMany({
    where:
      user.role === "STUDENT"
        ? { enrollments: { some: { userId: user.id } } }
        : user.role === "TEACHER"
          ? { teacherId: user.id }
          : {},
    include: { teacher: true },
    orderBy: { code: "asc" },
  });

  if (!courses.length) {
    return [{ type: "text", content: "No courses found for your timetable." }];
  }

  return [
    {
      type: "timetable_card",
      data: {
        entries: courses.map((c) => ({
          courseCode: c.code,
          courseName: c.name,
          schedule: c.schedule,
          location: c.location,
          faculty: c.teacher.name,
        })),
      },
    },
  ];
}

function blocksToReply(blocks: UIBlock[]): string {
  return blocks
    .filter((b) => b.type === "text")
    .map((b) => (b as { content: string }).content)
    .join("\n\n");
}

export async function runOrchestrator(
  user: SessionUser,
  message: string
): Promise<OrchestratorResult> {
  const intent = detectIntent(message);
  let blocks: UIBlock[] = [];

  switch (intent) {
    case "CAMPUS_MAP":
      blocks = await handleCampusMap();
      break;
    case "NAVIGATION":
      blocks = await handleNavigation(message);
      break;
    case "BUILDING":
      blocks = await handleBuilding(message);
      if (!blocks.length) blocks = await handleRag(message);
      break;
    case "FACULTY":
      blocks = await handleFaculty(message);
      break;
    case "EVENTS":
      blocks = await handleEvents();
      break;
    case "NOTICES":
      blocks = await handleNotices();
      break;
    case "NEARBY":
      blocks = await handleNearby(message);
      break;
    case "ATTENDANCE":
      blocks = await handleAttendance(user);
      break;
    case "FEES":
      blocks = await handleFees(user);
      break;
    case "GRADES":
      blocks = await handleGrades(user);
      break;
    case "CGPA":
      blocks = await handleCgpa(user);
      break;
    case "RESULTS_CHARTS":
      blocks = await handleResultsCharts(user);
      break;
    case "ASSIGNMENTS":
      blocks = await handleAssignments(user, "all");
      break;
    case "PROJECTS":
      blocks = await handleAssignments(user, "projects");
      break;
    case "REPORTS":
      blocks = await handleAssignments(user, "reports");
      break;
    case "TIMETABLE":
      blocks = await handleTimetable(user);
      break;
    case "HOSTEL":
      blocks = [
        {
          type: "hostel_card",
          data: {
            name: "Uni-Hostel Complex",
            block: "Multiple blocks (Boys & Girls)",
            type: "On-campus residential",
            facilities: ["Mess", "Wi-Fi", "Laundry", "24/7 Security"],
            warden: "Contact hostel office",
            description:
              "LPU provides on-campus hostel accommodation with separate residential areas. Allotment is handled through hostel administration.",
          },
        },
      ];
      {
        const rag = await handleRag(message);
        const sourcesOnly = rag.filter((b) => b.type === "sources_card");
        blocks.push(...sourcesOnly);
      }
      break;
    case "LIBRARY":
      blocks = [
        {
          type: "library_card",
          data: {
            name: "Central Library",
            hours: "8:00 AM – 10:00 PM (typical hours)",
            location: "Near Block 32, Central Campus",
            services: ["Books", "Journals", "Digital Resources", "Study Areas", "Computer Lab"],
            description:
              "LPU Central Library offers books, journals, and digital resources. Valid ID card required for access.",
          },
        },
        {
          type: "campus_map",
          data: {
            centerLat: CAMPUS_BLOCKS.library.lat,
            centerLng: CAMPUS_BLOCKS.library.lng,
            zoom: 18,
            markers: [
              {
                lat: CAMPUS_BLOCKS.library.lat,
                lng: CAMPUS_BLOCKS.library.lng,
                label: "Central Library",
              },
            ],
          },
        },
      ];
      break;
    default:
      blocks = await handleRag(message);
      if (blocks.length === 1 && blocks[0].type === "text") {
        // Add quick actions for general queries
        blocks.push({
          type: "quick_actions",
          data: {
            actions: [
              { label: "Campus map", query: "show campus map", icon: "map" },
              { label: "Events", query: "Upcoming campus events", icon: "event" },
              { label: "Navigate", query: "from Central Library to LPU Mall", icon: "map" },
              { label: "Library", query: "Library hours and location", icon: "library" },
            ],
          },
        });
      }
  }

  if (!blocks.length) {
    blocks = [
      {
        type: "text",
        content: "I can help with campus navigation, events, faculty information, and more. How may I assist you?",
      },
    ];
  }

  return {
    intent,
    blocks,
    reply: blocksToReply(blocks) || "Here is the information you requested.",
  };
}
