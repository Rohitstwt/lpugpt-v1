export type Intent =
  | {
      type: "UPDATE_LOCATION";
      courseCode: string;
      location: string;
      building?: string;
      room?: string;
      note?: string;
    }
  | {
      type: "UPDATE_SCHEDULE";
      courseCode: string;
      schedule: string;
      note?: string;
    }
  | {
      type: "ANNOUNCE";
      courseCode?: string;
      title: string;
      body: string;
    }
  | {
      type: "QUERY_COURSE";
      courseCode?: string;
      query: string;
    }
  | {
      type: "QUERY_LOCATION";
      courseCode?: string;
      query: string;
    }
  | {
      type: "QUERY_UPDATES";
      courseCode?: string;
      query: string;
    }
  | {
      type: "HELP";
      query: string;
    }
  | {
      type: "UNKNOWN";
      query: string;
    };

const COURSE_CODE = /\b([A-Z]{2,4}\s?-?\s?\d{2,4}[A-Z]?)\b/i;

function normalizeCode(raw: string): string {
  return raw.replace(/\s+/g, "").replace(/-/g, "").toUpperCase();
}

function extractCourseCode(text: string): string | undefined {
  const m = text.match(COURSE_CODE);
  return m ? normalizeCode(m[1]) : undefined;
}

function extractLocation(text: string): { location: string; building?: string; room?: string } | null {
  const patterns = [
    /(?:to|at|in)\s+(?:the\s+)?((?:block|bldg|building|lab|hall|auditorium|room)\s*[\w\-./]+(?:\s*(?:room|rm)\s*[\w\-./]+)?)/i,
    /(?:moved?|relocat(?:e|ed)|shift(?:ed)?)\s+(?:to\s+)?((?:block|bldg|building|lab|hall|room)\s*[\w\-./]+(?:\s*(?:room|rm)\s*[\w\-./]+)?)/i,
    /(?:new\s+)?(?:location|venue)\s*(?:is|:|=)\s*((?:block|bldg|building|lab|hall|room)\s*[\w\-./]+(?:\s*(?:room|rm)\s*[\w\-./]+)?)/i,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const location = m[1].replace(/\s+/g, " ").trim();
      const building = location.match(/(?:block|bldg|building)\s*([\w\-./]+)/i)?.[0];
      const room = location.match(/(?:room|rm)\s*([\w\-./]+)/i)?.[0];
      return { location, building, room };
    }
  }

  // Fallback: "Block 38-401" style
  const compact = text.match(/\b((?:block|bldg)\s*\d+[\w\-./]*)\b/i);
  if (compact?.[1]) {
    return { location: compact[1].replace(/\s+/g, " ").trim(), building: compact[1] };
  }

  return null;
}

export function parseIntent(raw: string): Intent {
  const text = raw.trim();
  const lower = text.toLowerCase();
  const courseCode = extractCourseCode(text);

  if (
    /^(help|what can you do|how (do|does|to)|commands?)\b/i.test(lower) ||
    lower === "?"
  ) {
    return { type: "HELP", query: text };
  }

  const isUpdate =
    /\b(move|moved|relocat|shift|change|update|set|put|transfer)\b/i.test(lower) ||
    /\b(new location|venue change|room change|class (is )?now)\b/i.test(lower);

  if (isUpdate && courseCode) {
    const loc = extractLocation(text);
    if (loc) {
      return {
        type: "UPDATE_LOCATION",
        courseCode,
        location: loc.location,
        building: loc.building,
        room: loc.room,
        note: text,
      };
    }

    const scheduleMatch = text.match(
      /(?:to|at|for)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?(?:\s*[-–to]+\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?)/i
    );
    if (scheduleMatch || /\b(time|schedule|timing)\b/i.test(lower)) {
      return {
        type: "UPDATE_SCHEDULE",
        courseCode,
        schedule: scheduleMatch?.[1]?.trim() ?? text,
        note: text,
      };
    }
  }

  if (
    /\b(announce|announcement|tell (the )?class|notify|broadcast|post)\b/i.test(lower)
  ) {
    const body = text
      .replace(/^(please\s+)?(announce|post|broadcast|notify)(:|\s)+/i, "")
      .trim();
    return {
      type: "ANNOUNCE",
      courseCode,
      title: courseCode ? `Announcement · ${courseCode}` : "Campus announcement",
      body: body || text,
    };
  }

  if (
    /\b(where|location|venue|room|building|which (block|room))\b/i.test(lower)
  ) {
    return { type: "QUERY_LOCATION", courseCode, query: text };
  }

  if (/\b(update|updates|latest|happening|changed|change)\b/i.test(lower)) {
    return { type: "QUERY_UPDATES", courseCode, query: text };
  }

  if (courseCode || /\b(class|course|timetable|schedule|today)\b/i.test(lower)) {
    return { type: "QUERY_COURSE", courseCode, query: text };
  }

  return { type: "UNKNOWN", query: text };
}
