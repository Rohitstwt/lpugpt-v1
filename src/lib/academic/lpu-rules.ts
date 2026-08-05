/**
 * LPU-aligned academic rules for Mock UMS calculators.
 * These mirror common university norms (75% attendance, 10-point CGPA).
 * Not an official LPU UMS feed — for demo / planning only.
 */

export const LPU_ATTENDANCE_MIN = 75;
export const LPU_ATTENDANCE_WARN = 65;

/** 10-point grade → grade point (LPU-style letter scale). */
export const GRADE_POINTS: Record<string, number> = {
  O: 10,
  "A+": 10,
  A: 9,
  "B+": 8,
  B: 7,
  "C+": 6,
  C: 5,
  "D+": 4,
  D: 4,
  E: 0,
  F: 0,
  AB: 0,
};

export function gradeToPoint(grade: string): number {
  const g = grade.trim().toUpperCase();
  if (g in GRADE_POINTS) return GRADE_POINTS[g];
  // bare letter fallback
  const letter = g.replace(/[^A-Z]/g, "");
  if (letter in GRADE_POINTS) return GRADE_POINTS[letter];
  return 0;
}

export type AttendanceCalcRow = {
  courseCode: string;
  courseName?: string;
  present: number;
  total: number;
  percentage: number;
  status: "eligible" | "warning" | "ineligible";
  /** Classes you can still miss and stay ≥ 75% */
  canMiss: number;
  /** Extra classes to attend to reach 75% (0 if already there) */
  needAttend: number;
  note: string;
};

export function calcAttendanceRow(
  courseCode: string,
  present: number,
  total: number,
  courseName?: string,
  minPct = LPU_ATTENDANCE_MIN
): AttendanceCalcRow {
  const percentage = total > 0 ? Math.round((present / total) * 1000) / 10 : 0;
  const status: AttendanceCalcRow["status"] =
    percentage >= minPct
      ? "eligible"
      : percentage >= LPU_ATTENDANCE_WARN
        ? "warning"
        : "ineligible";

  // Max future bunks while keeping ≥ min%: present / (total + b) ≥ min/100
  const canMiss = Math.max(0, Math.floor(present / (minPct / 100) - total));

  // Classes to attend consecutively to reach min% if below
  let needAttend = 0;
  if (percentage < minPct) {
    const target = minPct / 100;
    // (P+x)/(T+x) >= target => x >= (target*T - P) / (1 - target)
    needAttend = Math.max(
      0,
      Math.ceil((target * total - present) / (1 - target))
    );
  }

  const note =
    status === "eligible"
      ? canMiss > 0
        ? `Safe to miss up to ${canMiss} more class${canMiss === 1 ? "" : "es"}.`
        : "On the edge — don't miss the next class."
      : `Need ${needAttend} more class${needAttend === 1 ? "" : "es"} in a row to hit ${minPct}%.`;

  return {
    courseCode,
    courseName,
    present,
    total,
    percentage,
    status,
    canMiss,
    needAttend,
    note,
  };
}

export type CgpaRow = {
  courseCode: string;
  courseName?: string;
  grade: string;
  marks?: number | null;
  credits: number;
  gradePoint: number;
  weighted: number;
  term?: string;
};

export function buildCgpaRows(
  rows: Array<{
    courseCode: string;
    courseName?: string;
    grade: string;
    marks?: number | null;
    credits?: number;
    term?: string;
  }>
): { rows: CgpaRow[]; sgpa: number; totalCredits: number } {
  const mapped: CgpaRow[] = rows.map((r) => {
    const credits = r.credits ?? 3;
    const gradePoint = gradeToPoint(r.grade);
    return {
      courseCode: r.courseCode,
      courseName: r.courseName,
      grade: r.grade,
      marks: r.marks,
      credits,
      gradePoint,
      weighted: gradePoint * credits,
      term: r.term,
    };
  });
  const totalCredits = mapped.reduce((s, r) => s + r.credits, 0);
  const sgpa =
    totalCredits > 0
      ? Math.round(
          (mapped.reduce((s, r) => s + r.weighted, 0) / totalCredits) * 100
        ) / 100
      : 0;
  return { rows: mapped, sgpa, totalCredits };
}

export function classifyCgpa(cgpa: number) {
  if (cgpa >= 9) return { label: "Outstanding", hint: "Top band on the 10-point scale" };
  if (cgpa >= 8) return { label: "Excellent", hint: "Strong semester" };
  if (cgpa >= 7) return { label: "Good", hint: "Solid — room to push higher" };
  if (cgpa >= 6) return { label: "Average", hint: "Focus on weaker courses" };
  return { label: "Needs work", hint: "Plan recovery next term" };
}
