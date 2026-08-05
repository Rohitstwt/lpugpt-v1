import type { SessionUser } from "@/lib/auth";
import {
  erpGetAttendance,
  erpGetFees,
  erpGetHostel,
  erpGetResults,
  erpGetSummary,
  erpMarkFeePaid,
} from "@/lib/erp";
import { prisma } from "@/lib/db";
import { accessibleCoursesForAgent } from "@/lib/erp-agent-helpers";

export type AgentStep = {
  id: string;
  title: string;
  status: "ok" | "warn" | "fail";
  detail: string;
};

export type AgentRun = {
  goal: string;
  steps: AgentStep[];
  reply: string;
  intent: string;
};

function isAgenticErpRequest(message: string) {
  const lower = message.toLowerCase();
  return (
    /\b(agent|automate|automation|workflow|multi[- ]?step|do (it|everything|all)|handle (it|this|my)|take care of|run (an? )?erp|erp agent)\b/i.test(
      lower
    ) ||
    /\b(eligible|eligibility|exam ready|ready for exam|clear (all )?(my )?dues|pay all|semester (check|review)|checkup|before (my )?exams?|attendance risk|what should i (do|fix))\b/i.test(
      lower
    )
  );
}

async function stepAttendance(user: SessionUser): Promise<AgentStep> {
  const rows = await prisma.attendanceRecord.findMany({
    where: { userId: user.id },
    include: { course: true },
  });
  if (!rows.length) {
    return {
      id: "attendance",
      title: "Check attendance",
      status: "fail",
      detail: "No attendance records in mock ERP.",
    };
  }
  const risks = rows
    .map((r) => {
      const p = r.total ? Math.round((r.present / r.total) * 1000) / 10 : 0;
      return { code: r.course.code, p, present: r.present, total: r.total };
    })
    .filter((r) => r.p < 75);

  if (risks.length) {
    return {
      id: "attendance",
      title: "Check attendance",
      status: "warn",
      detail: `At risk (<75%): ${risks
        .map((r) => `${r.code} ${r.p}% (${r.present}/${r.total})`)
        .join("; ")}`,
    };
  }
  return {
    id: "attendance",
    title: "Check attendance",
    status: "ok",
    detail: `All ${rows.length} courses are at/above 75%.`,
  };
}

async function stepFees(user: SessionUser, autoPay: boolean): Promise<AgentStep[]> {
  const before = await erpGetFees(user);
  const steps: AgentStep[] = [
    {
      id: "fees_scan",
      title: "Scan fee dues",
      status: before.ok ? "ok" : "fail",
      detail: before.message.split("\n").slice(-1)[0] || before.message,
    },
  ];

  if (!autoPay) return steps;

  // Pay until no dues remain (mock)
  let guard = 0;
  const payments: string[] = [];
  while (guard < 5) {
    const pay = await erpMarkFeePaid(user);
    if (!pay.ok) break;
    payments.push(pay.message);
    guard += 1;
  }

  steps.push({
    id: "fees_pay",
    title: autoPay ? "Auto-pay outstanding dues (mock)" : "Fee payment",
    status: payments.length ? "ok" : "warn",
    detail: payments.length
      ? payments.join(" → ")
      : "No payable dues found (or already clear).",
  });

  const after = await erpGetFees(user);
  steps.push({
    id: "fees_verify",
    title: "Verify fee balance",
    status: /Total outstanding: ₹0/.test(after.message) ? "ok" : "warn",
    detail: after.message.split("\n").slice(-1)[0] || after.message,
  });

  return steps;
}

async function stepResults(user: SessionUser): Promise<AgentStep> {
  const result = await erpGetResults(user);
  return {
    id: "results",
    title: "Pull latest results",
    status: result.ok ? "ok" : "warn",
    detail: result.ok
      ? result.message.split("\n").slice(1).join(" | ") || result.message
      : result.message,
  };
}

async function stepHostel(user: SessionUser): Promise<AgentStep> {
  const result = await erpGetHostel(user);
  return {
    id: "hostel",
    title: "Confirm hostel allotment",
    status: result.ok ? "ok" : "warn",
    detail: result.message,
  };
}

async function stepLiveClasses(user: SessionUser): Promise<AgentStep> {
  const courses = await accessibleCoursesForAgent(user);
  if (!courses.length) {
    return {
      id: "classes",
      title: "Load live class venues",
      status: "warn",
      detail: "No enrolled courses found.",
    };
  }
  return {
    id: "classes",
    title: "Load live class venues",
    status: "ok",
    detail: courses
      .slice(0, 6)
      .map((c) => `${c.code} @ ${c.location} (${c.schedule})`)
      .join(" · "),
  };
}

function formatAgentReply(goal: string, steps: AgentStep[]) {
  const lines = [
    `**ERP Agent run** — ${goal}`,
    "",
    ...steps.map((s, i) => {
      const icon = s.status === "ok" ? "✓" : s.status === "warn" ? "!" : "✗";
      return `${i + 1}. [${icon}] **${s.title}**\n   ${s.detail}`;
    }),
    "",
    "_Mock ERP agent — actions are simulated, not real UMS writes._",
  ];
  return lines.join("\n");
}

/**
 * Agentic ERP orchestrator: plans + executes multi-step campus workflows.
 */
export async function runErpAgent(
  user: SessionUser,
  message: string
): Promise<AgentRun | null> {
  if (!isAgenticErpRequest(message)) return null;

  const lower = message.toLowerCase();
  const steps: AgentStep[] = [];
  let goal = "ERP automation";

  // Workflow: clear all dues
  if (
    /\b(clear (all )?(my )?dues|pay all|settle (all )?(my )?fees|auto[- ]?pay)\b/i.test(
      lower
    )
  ) {
    goal = "Clear outstanding fee dues";
    steps.push(...(await stepFees(user, true)));
    return {
      goal,
      steps,
      intent: "ERP_AGENT_PAY",
      reply: formatAgentReply(goal, steps),
    };
  }

  // Workflow: exam eligibility / before exams
  if (
    /\b(eligible|eligibility|exam ready|ready for exam|before (my )?exams?|exam check)\b/i.test(
      lower
    )
  ) {
    goal = "Exam readiness check";
    steps.push(await stepAttendance(user));
    steps.push(...(await stepFees(user, false)));
    steps.push(await stepLiveClasses(user));
    const blocked = steps.some((s) => s.status === "fail");
    const risky = steps.some((s) => s.status === "warn");
    steps.push({
      id: "verdict",
      title: "Agent verdict",
      status: blocked ? "fail" : risky ? "warn" : "ok",
      detail: blocked
        ? "Blocked in mock ERP — fix failing checks first."
        : risky
          ? "Conditionally ready — resolve warnings (attendance <75% or unpaid dues)."
          : "Looks exam-ready in mock ERP (attendance + fees + venues OK).",
    });
    return {
      goal,
      steps,
      intent: "ERP_AGENT_EXAM",
      reply: formatAgentReply(goal, steps),
    };
  }

  // Workflow: attendance risk remediation plan
  if (/\b(attendance risk|low attendance|below 75|what should i (do|fix))\b/i.test(lower)) {
    goal = "Attendance risk plan";
    const att = await stepAttendance(user);
    steps.push(att);
    steps.push(await stepLiveClasses(user));
    steps.push({
      id: "plan",
      title: "Next actions",
      status: att.status === "ok" ? "ok" : "warn",
      detail:
        att.status === "ok"
          ? "No attendance risk. Keep showing up."
          : "Prioritize the flagged courses this week, avoid bunks, and confirm live venues before each class.",
    });
    return {
      goal,
      steps,
      intent: "ERP_AGENT_ATTENDANCE",
      reply: formatAgentReply(goal, steps),
    };
  }

  // Default agentic semester checkup
  goal = "Semester ERP checkup";
  steps.push(await stepAttendance(user));
  steps.push(...(await stepFees(user, /\b(pay|clear|automate)\b/i.test(lower))));
  steps.push(await stepResults(user));
  steps.push(await stepHostel(user));
  steps.push(await stepLiveClasses(user));
  steps.push({
    id: "done",
    title: "Agent complete",
    status: steps.some((s) => s.status === "fail")
      ? "fail"
      : steps.some((s) => s.status === "warn")
        ? "warn"
        : "ok",
    detail: "Multi-step ERP workflow finished on mock data.",
  });

  return {
    goal,
    steps,
    intent: "ERP_AGENT",
    reply: formatAgentReply(goal, steps),
  };
}

// Re-export single-ops for convenience in agent tooling UIs
export const erpAgentTools = {
  erpGetAttendance,
  erpGetFees,
  erpGetHostel,
  erpGetResults,
  erpGetSummary,
  erpMarkFeePaid,
};
