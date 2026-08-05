import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publishMeshEvent } from "@/lib/mesh";
import { getLlm, resolveOllamaChatModel } from "@/lib/ai/llm";
import { formatRetrievedContext, retrieveKnowledge } from "@/lib/ai/rag";
import {
  erpGetAttendance,
  erpGetFees,
  erpGetHostel,
  erpGetResults,
  erpGetSummary,
  erpMarkFeePaid,
} from "@/lib/erp";
import { runErpAgent } from "@/lib/ai/erp-agent";

export type ChatReply = {
  reply: string;
  intent: string;
  meshEvent?: {
    id: string;
    type: string;
    title: string;
    body: string;
    courseCode?: string | null;
    location?: string | null;
    authorName?: string | null;
    createdAt?: string;
  };
};

type ToolResult = {
  ok: boolean;
  message: string;
  meshEvent?: ChatReply["meshEvent"];
  intent?: string;
};

function canMutate(user: SessionUser) {
  return user.role === "TEACHER" || user.role === "ADMIN";
}

function normalizeCode(raw?: string) {
  if (!raw) return undefined;
  return raw.replace(/\s+/g, "").replace(/-/g, "").toUpperCase();
}

async function findCourse(code?: string) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  return prisma.course.findFirst({
    where: { code: { equals: normalized } },
    include: {
      teacher: true,
      updates: { orderBy: { createdAt: "desc" }, take: 3 },
    },
  });
}

async function accessibleCourses(user: SessionUser) {
  if (user.role === "ADMIN") {
    return prisma.course.findMany({
      include: { teacher: true },
      orderBy: { code: "asc" },
    });
  }
  if (user.role === "TEACHER") {
    return prisma.course.findMany({
      where: { teacherId: user.id },
      include: { teacher: true },
      orderBy: { code: "asc" },
    });
  }
  return prisma.course.findMany({
    where: { enrollments: { some: { userId: user.id } } },
    include: { teacher: true },
    orderBy: { code: "asc" },
  });
}

async function buildCampusContext(user: SessionUser) {
  const courses = await accessibleCourses(user);
  const updates = await prisma.campusUpdate.findMany({
    where:
      user.role === "ADMIN"
        ? {}
        : user.role === "TEACHER"
          ? { OR: [{ authorId: user.id }, { course: { teacherId: user.id } }] }
          : { course: { enrollments: { some: { userId: user.id } } } },
    include: { course: true, author: true },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const courseLines = courses.length
    ? courses
        .map(
          (c) =>
            `- ${c.code}: ${c.name} | location=${c.location} | schedule=${c.schedule} | faculty=${c.teacher.name}`
        )
        .join("\n")
    : "- (none)";

  const updateLines = updates.length
    ? updates
        .map(
          (u) =>
            `- [${u.createdAt.toISOString()}] ${u.title}${u.course ? ` (${u.course.code})` : ""}: ${u.body}`
        )
        .join("\n")
    : "- (none)";

  return { courseLines, updateLines, courses };
}

const tools = [
  {
    type: "function" as const,
    function: {
      name: "search_knowledge",
      description:
        "Search the LPU campus knowledge base for grounded facts (campus info, FAQs, facilities, rankings, policies).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "What to look up in the knowledge base" },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_courses",
      description: "List the user's accessible courses with live location and schedule.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_course",
      description: "Get live details for a specific course code.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "Course code like CSE301" },
        },
        required: ["code"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_updates",
      description: "Get recent campus/class updates.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "Optional course code filter" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_location",
      description:
        "Teacher/admin only. Update a course location instantly so students can find it.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string" },
          location: { type: "string" },
          building: { type: "string" },
          room: { type: "string" },
          note: { type: "string" },
        },
        required: ["code", "location"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_schedule",
      description: "Teacher/admin only. Update a course schedule/timing.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string" },
          schedule: { type: "string" },
        },
        required: ["code", "schedule"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "announce",
      description: "Teacher/admin only. Post an announcement for a class or campus.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
        },
        required: ["body"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "erp_attendance",
      description: "Mock University ERP: get attendance percentage for the student (optional course code).",
      parameters: {
        type: "object",
        properties: { code: { type: "string" } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "erp_fees",
      description: "Mock University ERP: get fee invoices and outstanding dues.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "erp_results",
      description: "Mock University ERP: get grades/results (optional term like '2025 Fall').",
      parameters: {
        type: "object",
        properties: { term: { type: "string" } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "erp_hostel",
      description: "Mock University ERP: get hostel allotment details.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "erp_summary",
      description: "Mock University ERP: full snapshot (attendance, fees, results, hostel).",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "erp_pay_fee",
      description:
        "Mock University ERP: simulate paying the next due fee invoice (demo only, not real money).",
      parameters: {
        type: "object",
        properties: { invoiceId: { type: "string" } },
        additionalProperties: false,
      },
    },
  },
];

async function runTool(
  user: SessionUser,
  name: string,
  rawArgs: string
): Promise<ToolResult> {
  let args: Record<string, string> = {};
  try {
    args = JSON.parse(rawArgs || "{}") as Record<string, string>;
  } catch {
    return { ok: false, message: "Invalid tool arguments." };
  }

  switch (name) {
    case "search_knowledge": {
      const hits = await retrieveKnowledge(args.query || "", 3);
      return {
        ok: true,
        intent: "RAG",
        message: formatRetrievedContext(hits),
      };
    }

    case "list_courses": {
      const courses = await accessibleCourses(user);
      if (!courses.length) {
        return { ok: true, message: "No courses found for this user.", intent: "QUERY_COURSE" };
      }
      return {
        ok: true,
        intent: "QUERY_COURSE",
        message: courses
          .map(
            (c) =>
              `${c.code} — ${c.name}\nLocation: ${c.location}\nSchedule: ${c.schedule}\nFaculty: ${c.teacher.name}`
          )
          .join("\n\n"),
      };
    }

    case "get_course": {
      const course = await findCourse(args.code);
      if (!course) {
        return {
          ok: false,
          intent: "QUERY_COURSE",
          message: `Course ${normalizeCode(args.code) || args.code} not found.`,
        };
      }
      if (user.role === "STUDENT") {
        const enrolled = await prisma.enrollment.findFirst({
          where: { userId: user.id, courseId: course.id },
        });
        if (!enrolled) {
          return {
            ok: false,
            intent: "QUERY_COURSE",
            message: `User is not enrolled in ${course.code}.`,
          };
        }
      }
      const latest = course.updates[0];
      return {
        ok: true,
        intent: "QUERY_COURSE",
        message: [
          `${course.code} — ${course.name}`,
          `Location: ${course.location}`,
          `Schedule: ${course.schedule}`,
          `Faculty: ${course.teacher.name}`,
          latest
            ? `Latest update: ${latest.title}${latest.location ? ` → ${latest.location}` : ""} (${latest.createdAt.toISOString()})`
            : "Latest update: none",
        ].join("\n"),
      };
    }

    case "get_updates": {
      const code = normalizeCode(args.code);
      const where =
        user.role === "ADMIN"
          ? code
            ? { course: { code } }
            : {}
          : user.role === "TEACHER"
            ? {
                OR: [
                  { authorId: user.id },
                  { course: { teacherId: user.id } },
                  ...(code ? [{ course: { code } }] : []),
                ],
              }
            : {
                course: {
                  enrollments: { some: { userId: user.id } },
                  ...(code ? { code } : {}),
                },
              };

      const updates = await prisma.campusUpdate.findMany({
        where,
        include: { course: true, author: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      });

      if (!updates.length) {
        return { ok: true, intent: "QUERY_UPDATES", message: "No recent updates." };
      }

      return {
        ok: true,
        intent: "QUERY_UPDATES",
        message: updates
          .map(
            (u) =>
              `${u.title}${u.course ? ` (${u.course.code})` : ""}\n${u.body}\n${u.createdAt.toISOString()} · ${u.author.name}`
          )
          .join("\n\n"),
      };
    }

    case "update_location": {
      if (!canMutate(user)) {
        return {
          ok: false,
          intent: "UPDATE_LOCATION",
          message: "Permission denied. Only teachers and admins can update locations.",
        };
      }
      const course = await findCourse(args.code);
      if (!course) {
        return { ok: false, intent: "UPDATE_LOCATION", message: "Course not found." };
      }
      if (user.role === "TEACHER" && course.teacherId !== user.id) {
        return {
          ok: false,
          intent: "UPDATE_LOCATION",
          message: `You can only update courses you teach. ${course.code} is taught by ${course.teacher.name}.`,
        };
      }

      const previous = course.location;
      const updated = await prisma.course.update({
        where: { id: course.id },
        data: {
          location: args.location,
          building: args.building ?? course.building,
          room: args.room ?? course.room,
        },
      });

      const campusUpdate = await prisma.campusUpdate.create({
        data: {
          courseId: course.id,
          authorId: user.id,
          type: "LOCATION",
          title: `${course.code} relocated`,
          body: `${course.code} moved from ${previous} to ${args.location}.`,
          location: args.location,
          building: args.building ?? null,
          room: args.room ?? null,
          metadata: JSON.stringify({ previous, note: args.note ?? null }),
        },
      });

      const meshEvent = {
        id: campusUpdate.id,
        type: "LOCATION",
        title: campusUpdate.title,
        body: campusUpdate.body,
        courseCode: course.code,
        location: args.location,
        authorName: user.name,
        createdAt: campusUpdate.createdAt.toISOString(),
      };
      publishMeshEvent(meshEvent);

      return {
        ok: true,
        intent: "UPDATE_LOCATION",
        meshEvent,
        message: `${updated.code} location updated to ${updated.location}. Students will see this immediately.`,
      };
    }

    case "update_schedule": {
      if (!canMutate(user)) {
        return {
          ok: false,
          intent: "UPDATE_SCHEDULE",
          message: "Permission denied. Only teachers and admins can update schedules.",
        };
      }
      const course = await findCourse(args.code);
      if (!course) {
        return { ok: false, intent: "UPDATE_SCHEDULE", message: "Course not found." };
      }
      if (user.role === "TEACHER" && course.teacherId !== user.id) {
        return {
          ok: false,
          intent: "UPDATE_SCHEDULE",
          message: "You can only update courses you teach.",
        };
      }

      const previous = course.schedule;
      await prisma.course.update({
        where: { id: course.id },
        data: { schedule: args.schedule },
      });

      const campusUpdate = await prisma.campusUpdate.create({
        data: {
          courseId: course.id,
          authorId: user.id,
          type: "SCHEDULE",
          title: `${course.code} schedule change`,
          body: `Schedule changed from "${previous}" to "${args.schedule}".`,
          metadata: JSON.stringify({ previous }),
        },
      });

      const meshEvent = {
        id: campusUpdate.id,
        type: "SCHEDULE",
        title: campusUpdate.title,
        body: campusUpdate.body,
        courseCode: course.code,
        location: course.location,
        authorName: user.name,
        createdAt: campusUpdate.createdAt.toISOString(),
      };
      publishMeshEvent(meshEvent);

      return {
        ok: true,
        intent: "UPDATE_SCHEDULE",
        meshEvent,
        message: `${course.code} schedule updated to ${args.schedule}.`,
      };
    }

    case "announce": {
      if (!canMutate(user)) {
        return {
          ok: false,
          intent: "ANNOUNCE",
          message: "Permission denied. Only teachers and admins can post announcements.",
        };
      }
      const course = args.code ? await findCourse(args.code) : null;
      if (args.code && !course) {
        return { ok: false, intent: "ANNOUNCE", message: "Course not found." };
      }
      if (course && user.role === "TEACHER" && course.teacherId !== user.id) {
        return {
          ok: false,
          intent: "ANNOUNCE",
          message: "You can only announce for courses you teach.",
        };
      }

      const title =
        args.title ||
        (course ? `Announcement · ${course.code}` : "Campus announcement");

      const campusUpdate = await prisma.campusUpdate.create({
        data: {
          courseId: course?.id,
          authorId: user.id,
          type: "ANNOUNCEMENT",
          title,
          body: args.body,
          location: course?.location,
        },
      });

      const meshEvent = {
        id: campusUpdate.id,
        type: "ANNOUNCEMENT",
        title: campusUpdate.title,
        body: campusUpdate.body,
        courseCode: course?.code ?? null,
        location: course?.location ?? null,
        authorName: user.name,
        createdAt: campusUpdate.createdAt.toISOString(),
      };
      publishMeshEvent(meshEvent);

      return {
        ok: true,
        intent: "ANNOUNCE",
        meshEvent,
        message: `Announcement posted${course ? ` for ${course.code}` : ""}: ${args.body}`,
      };
    }

    case "erp_attendance":
      return erpGetAttendance(user, args.code);
    case "erp_fees":
      return erpGetFees(user);
    case "erp_results":
      return erpGetResults(user, args.term);
    case "erp_hostel":
      return erpGetHostel(user);
    case "erp_summary":
      return erpGetSummary(user);
    case "erp_pay_fee":
      return erpMarkFeePaid(user, args.invoiceId);

    default:
      return { ok: false, message: `Unknown tool: ${name}` };
  }
}

function isGreeting(message: string) {
  const lower = message.toLowerCase().trim();
  return /^(hi|hlo|hello|hey|yo|sup|hola|namaste|good\s*(morning|afternoon|evening)|how are you|whats? up|what'?s up)[\s!?.]*$/i.test(
    lower
  );
}

function looksCampusRelated(message: string) {
  const lower = message.toLowerCase().trim();
  if (!lower) return false;

  // Short greetings / small talk → normal LLM chat
  if (isGreeting(message)) {
    return false;
  }

  return (
    /\b(lpu|campus|class|course|timetable|schedule|faculty|teacher|student|hostel|library|block\s*\d+|room\s*\d+|lab\s*\d+|cse\d+|dsa\d+|int\d+|eng\d+|announce|update|enroll|attendance|exam|ums|erp|fee|dues?|invoice|result|grade|marks|gpa|cgpa|nirf|pay|payment|warden|eligible|eligibility|automate|agent|checkup)\b/i.test(
      lower
    ) || /\b[A-Z]{2,4}\s?-?\s?\d{2,4}[A-Z]?\b/.test(message)
  );
}

export async function runChat(
  user: SessionUser,
  message: string,
  opts?: { attachmentContext?: string }
): Promise<ChatReply> {
  // Agentic multi-step ERP workflows first
  const agent = await runErpAgent(user, message);
  if (agent) {
    return { reply: agent.reply, intent: agent.intent };
  }

  // Deterministic mock-ERP routing (small local models often skip tools)
  const lower = message.toLowerCase();
  if (/\b(attendance|present|absent|bunk)\b/i.test(lower)) {
    const code = message.match(/\b([A-Z]{2,4}\s?-?\s?\d{2,4}[A-Z]?)\b/i)?.[1];
    const result = await erpGetAttendance(user, code);
    return { reply: result.message, intent: result.intent };
  }
  if (/\b(fee|fees|dues?|invoice|outstanding|tuition)\b/i.test(lower)) {
    if (/\b(pay|paid|payment|clear|settle)\b/i.test(lower)) {
      const result = await erpMarkFeePaid(user);
      return { reply: result.message, intent: result.intent };
    }
    const result = await erpGetFees(user);
    return { reply: result.message, intent: result.intent };
  }
  if (/\b(result|results|grade|grades|marks|gpa|cgpa|transcript)\b/i.test(lower)) {
    const result = await erpGetResults(user);
    return { reply: result.message, intent: result.intent };
  }
  if (/\b(hostel|warden|my room|allotment)\b/i.test(lower)) {
    const result = await erpGetHostel(user);
    return { reply: result.message, intent: result.intent };
  }
  if (/\b(erp|ums|my (account|dashboard)|erp summary)\b/i.test(lower)) {
    const result = await erpGetSummary(user);
    return { reply: result.message, intent: result.intent };
  }

  const llm = getLlm();
  const model =
    llm.provider === "ollama" ? await resolveOllamaChatModel(llm.model) : llm.model;
  const { client, provider } = llm;
  const campusMode = looksCampusRelated(message) || Boolean(opts?.attachmentContext);

  // Pull recent uploads only when explicitly asking about a file/image already uploaded.
  // Do NOT auto-inject notes/PDFs for casual "trip" chat — that caused wrong answers.
  let fileBoost = opts?.attachmentContext || "";
  if (
    !fileBoost &&
    /\b(file|upload|brief|notes|document|pdf|docx|summarize|summary|attachment|my (photo|image|poster|flyer)|this (photo|image|poster|flyer|attachment)|whatsapp)\b/i.test(
      message
    )
  ) {
    const wantsImage =
      /\b(photo|image|poster|flyer|whatsapp|picture|pic)\b/i.test(message);
    const recent = await prisma.uploadedFile.findMany({
      where: {
        userId: user.id,
        ...(wantsImage ? { kind: "image" } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: wantsImage ? 1 : 2,
    });
    if (recent.length) {
      fileBoost = recent
        .map((f) => {
          const body = f.extractedText?.slice(0, 8000) || "(no text)";
          return `--- FILE: ${f.filename} ---\n${body}`;
        })
        .join("\n\n");
    }
  }

  const { courseLines, updateLines } = campusMode || fileBoost
    ? await buildCampusContext(user)
    : { courseLines: "- (not needed for this message)", updateLines: "- (none)" };

  const retrieved = campusMode ? await retrieveKnowledge(message, 3) : [];
  const knowledgeBlock = campusMode
    ? formatRetrievedContext(retrieved)
    : "(skipped — general conversation)";

  const history = await prisma.chatMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    // Keep greetings fresh — don't drag old topics into "hlo"
    take: campusMode ? 16 : isGreeting(message) ? 0 : 10,
  });

  const historyMessages: ChatCompletionMessageParam[] = history
    .reverse()
    .filter((m) => m.role === "user" || m.role === "assistant")
    .filter((m, idx, arr) => {
      if (idx === arr.length - 1 && m.role === "user" && m.content === message) {
        return false;
      }
      return true;
    })
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const system = `You are LPUGPT — the campus AI for Lovely Professional University students.
Voice: sharp, warm, slightly witty — like a smart senior who actually uses UMS. Not a corporate FAQ bot. Not generic ChatGPT.

Identity rules:
- Call yourself LPUGPT. Never say you are ChatGPT, Claude, Llama, or "an open-source LLM".
- Prefer short answers (2–5 sentences) unless they ask for detail.
- Use campus slang lightly when it fits (UMS, Mid-terms, Block 38, Uni-Hostel) — never force it.
- For academic data (attendance, fees, marks, assignments, hostel), use erp_* tools. Never invent numbers.
- Mock UMS only — say so briefly when showing ERP data. Never claim real LPU UMS access.
- When tools return data, summarize like a human: lead with what matters, skip boilerplate.

You can still chat about anything (study tips, coding, life) — just stay in LPUGPT character.

User:
- Name: ${user.name}
- Role: ${user.role}
- Email: ${user.email}
- Department: ${user.department || "n/a"}

${
  fileBoost
    ? `User-uploaded file/image context (SOURCE OF TRUTH for attachment questions):
${fileBoost}

Answer from that context with specific dates, prices, contacts, itinerary. Don't claim you lack info if it's there.
`
    : ""
}
${
  campusMode
    ? `Campus-related message. Live course data:
${courseLines}

Recent updates:
${updateLines}

Retrieved campus knowledge (compressed — do not paste verbatim):
${knowledgeBlock}

Campus rules:
- Live class location/schedule/updates → use tools.
- Don't invent fees, room numbers, or official policy.
- Teachers/admins can update locations/schedules; students cannot.
- Answer in 2–4 short sentences. Never dump whole source docs.`
    : `General conversation (not campus logistics).
Reply naturally as LPUGPT. Don't refuse with campus-dataset messages. Don't force campus topics.
If they say hi/hlo/hey — greet warmly in 1–2 lines and ask how you can help.`
}

Always:
- Be clear and specific.
- Never dump tool names, JSON, or function-call syntax.
- End with a useful next step when it helps (e.g. "Want me to open Mock UMS to pay?").`;

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    ...historyMessages,
    { role: "user", content: message },
  ];

  let meshEvent: ChatReply["meshEvent"] | undefined;
  let intent = campusMode ? (retrieved.length ? "RAG" : "CAMPUS") : "CHAT";

  try {
    for (let step = 0; step < 5; step++) {
      const completion = await client.chat.completions.create({
        model,
        messages,
        ...(campusMode
          ? { tools, tool_choice: "auto" as const }
          : {}),
        temperature: campusMode ? 0.4 : 0.8,
      });

      const choice = completion.choices[0]?.message;
      if (!choice) {
        return {
          reply: "I blanked for a second — say that again?",
          intent: "ERROR",
        };
      }

      const toolCalls = choice.tool_calls ?? [];
      if (!toolCalls.length) {
        const content = choice.content?.trim() || "Hey — I'm here. What's up?";
        const cleaned = content
          .replace(/```json[\s\S]*?```/gi, "")
          .replace(/\{"name"\s*:\s*"[^"]+"[\s\S]*?\}/g, "")
          .trim();
        return {
          reply: cleaned || "Hey — I'm here. What's up?",
          intent,
          meshEvent,
        };
      }

      messages.push({
        role: "assistant",
        content: choice.content || "",
        tool_calls: toolCalls,
      });

      for (const call of toolCalls) {
        if (call.type !== "function") continue;
        const result = await runTool(user, call.function.name, call.function.arguments);
        if (result.ok && result.intent) intent = result.intent;
        if (result.meshEvent) meshEvent = result.meshEvent;
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    return {
      reply: "Got tangled up — try asking that one more time?",
      intent,
      meshEvent,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown LLM error";
    console.error("LLM chat failed:", detail);
    return {
      reply:
        provider === "ollama"
          ? `I couldn't reach the local open-source model (${model}). Make sure Ollama is running (\`ollama serve\`), then try again.\n\n(${detail})`
          : `The AI service is temporarily unavailable. Please try again.\n\n(${detail})`,
      intent: "ERROR",
    };
  }
}
