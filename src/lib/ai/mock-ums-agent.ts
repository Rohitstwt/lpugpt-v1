import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { UIBlock } from "@/types/ui-blocks";

export type AgentProgressStep = {
  id: string;
  title: string;
  status: "pending" | "running" | "ok" | "fail";
  detail: string;
};

export type PayFeesOptions = {
  /** Absolute origin of this Next app, e.g. http://localhost:3000 */
  baseUrl?: string;
  /** Raw Cookie header from the user's chat request (for session auth in the agent browser) */
  cookieHeader?: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function txnId() {
  return `TXN${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
}

function chromePath() {
  return (
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  );
}

function appOrigin(baseUrl?: string) {
  return (baseUrl || process.env.APP_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

export function isPayFeesCommand(message: string) {
  const lower = message.toLowerCase();
  return (
    /\b(pay|clear|settle)\b/.test(lower) &&
    /\b(fee|fees|dues?|invoice|tuition|hostel fee|exam fee)\b/.test(lower)
  );
}

export function isResetFeesCommand(message: string) {
  return /\b(reset|restore|refill)\b.*\b(fee|fees|dues?)\b/i.test(message);
}

export function isSubmitAssignmentCommand(message: string) {
  const lower = message.toLowerCase();
  return (
    /\b(submit|upload|turn in|hand in)\b/.test(lower) &&
    /\b(assignment|homework|lab report|project|coursework)\b/.test(lower)
  ) || /\b(assignment|homework).*\b(before|due|deadline)\b/.test(lower)
    || /\bbefore (the )?deadline\b/.test(lower) && /\b(assignment|submit|upload)\b/.test(lower);
}

export function isMockUmsCommand(message: string) {
  const lower = message.toLowerCase();
  return (
    isPayFeesCommand(message) ||
    isSubmitAssignmentCommand(message) ||
    /\b(open (ums|erp|fee portal)|launch (ums|erp)|go to (ums|fee))\b/.test(lower) ||
    /\b(apply leave|register (for )?course|update timetable)\b/.test(lower)
  );
}

function dueLabel(due: Date) {
  const ms = due.getTime() - Date.now();
  const days = Math.ceil(ms / 86400000);
  if (days < 0) return `Overdue by ${Math.abs(days)} day(s)`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

/** Ensure at least one pending assignment exists for demos. */
export async function ensureDemoAssignments(user: SessionUser) {
  const studentId =
    user.role === "ADMIN"
      ? (
          await prisma.user.findFirst({ where: { email: "student@lpu.in" } })
        )?.id ?? user.id
      : user.id;

  const pending = await prisma.assignmentTask.count({
    where: { userId: studentId, status: "PENDING" },
  });
  if (pending > 0) return studentId;

  await prisma.assignmentTask.deleteMany({ where: { userId: studentId } });
  const soon = new Date();
  soon.setDate(soon.getDate() + 2);
  const later = new Date();
  later.setDate(later.getDate() + 5);
  await prisma.assignmentTask.createMany({
    data: [
      {
        userId: studentId,
        courseCode: "CSE301",
        title: "DSA Lab Report — Graphs",
        dueDate: soon,
        status: "PENDING",
      },
      {
        userId: studentId,
        courseCode: "CSE310",
        title: "OS Project Checkpoint",
        dueDate: later,
        status: "PENDING",
      },
    ],
  });
  return studentId;
}

export async function runSubmitAssignmentAutomation(
  user: SessionUser,
  message = ""
): Promise<{ reply: string; intent: string; blocks: UIBlock[] }> {
  if (user.role !== "STUDENT" && user.role !== "ADMIN") {
    return {
      reply: "Assignment submit is for student accounts.",
      intent: "ERP_ASSIGN_AGENT",
      blocks: [
        { type: "text", content: "Assignment submit is for student accounts." },
      ],
    };
  }

  const studentId = await ensureDemoAssignments(user);
  const student =
    (await prisma.user.findUnique({ where: { id: studentId } })) ??
    ({ name: user.name, email: user.email } as { name: string; email: string });

  const codeHint = message.match(/\b([A-Z]{2,4}\s?-?\s?\d{2,4})\b/i)?.[1]
    ?.replace(/\s+/g, "")
    .toUpperCase();

  let task = codeHint
    ? await prisma.assignmentTask.findFirst({
        where: {
          userId: studentId,
          status: "PENDING",
          courseCode: codeHint,
        },
        orderBy: { dueDate: "asc" },
      })
    : null;

  // Prefer upcoming (before deadline) when the user asks that way
  if (!task && /\b(before|deadline|due)\b/i.test(message)) {
    task = await prisma.assignmentTask.findFirst({
      where: {
        userId: studentId,
        status: "PENDING",
        dueDate: { gte: new Date() },
      },
      orderBy: { dueDate: "asc" },
    });
  }

  if (!task) {
    task = await prisma.assignmentTask.findFirst({
      where: { userId: studentId, status: "PENDING" },
      orderBy: { dueDate: "asc" },
    });
  }

  if (!task) {
    return {
      reply: "No pending assignments in Mock UMS.",
      intent: "ERP_ASSIGN_AGENT",
      blocks: [
        {
          type: "text",
          content: "No pending assignments right now in Mock UMS.",
        },
      ],
    };
  }

  const agentKey = process.env.ERP_AGENT_KEY || "lpugpt-mock-agent";
  const studentEmail =
    ("email" in student && student.email) || user.email || "student@lpu.in";
  const portalPath = `/mock-erp/assignment.html?agent=1&key=${encodeURIComponent(agentKey)}&student=${encodeURIComponent(studentEmail)}`;

  return {
    reply: `Needs approval to submit ${task.courseCode}.`,
    intent: "ERP_ASSIGN_CONFIRM",
    blocks: [
      {
        type: "assignment_session",
        data: {
          url: portalPath,
          title: "Mock UMS · Assignments",
          studentName: student.name,
          studentEmail,
          courseCode: task.courseCode,
          assignmentTitle: task.title,
          dueLabel: dueLabel(task.dueDate),
          fileName: `${task.courseCode.toLowerCase()}-submission.pdf`,
          requireApproval: true,
        },
      },
    ],
  };
}

/** Demo helper: put hostel/exam invoices back to unpaid so "pay my fees" can run again. */
export async function resetDemoFees(user: SessionUser) {
  const studentId =
    user.role === "ADMIN"
      ? (
          await prisma.user.findFirst({ where: { email: "student@lpu.in" } })
        )?.id ?? user.id
      : user.id;

  await prisma.feeInvoice.deleteMany({ where: { userId: studentId } });
  await prisma.feeInvoice.createMany({
    data: [
      {
        userId: studentId,
        term: "2026 Spring",
        category: "tuition",
        amountInr: 85000,
        paidInr: 85000,
        status: "PAID",
        dueDate: new Date("2026-01-15"),
      },
      {
        userId: studentId,
        term: "2026 Spring",
        category: "hostel",
        amountInr: 42000,
        paidInr: 20000,
        status: "PARTIAL",
        dueDate: new Date("2026-02-28"),
      },
      {
        userId: studentId,
        term: "2026 Spring",
        category: "exam",
        amountInr: 3500,
        paidInr: 0,
        status: "DUE",
        dueDate: new Date("2026-03-10"),
      },
    ],
  });
}

async function resolveStudentId(user: SessionUser) {
  if (user.role === "ADMIN") {
    return (
      (
        await prisma.user.findFirst({ where: { email: "student@lpu.in" } })
      )?.id ?? user.id
    );
  }
  return user.id;
}

/**
 * Drive the Mock UMS fee page in a real Chrome window (like LPUGPTT v1).
 */
async function driveFeePortalWithBrowser(opts: {
  studentName: string;
  studentEmail?: string;
  origin: string;
  cookieHeader?: string;
  feeCategory: "hostel" | "exam" | "tuition";
}): Promise<{ ok: boolean; imageUrl?: string; message: string; txnHint?: string }> {
  const puppeteer = await import("puppeteer");
  const dir = path.join(process.cwd(), "public", "agent-receipts");
  await mkdir(dir, { recursive: true });
  const shotName = `fee-live-${Date.now()}.png`;
  const shotAbs = path.join(dir, shotName);
  const agentKey = process.env.ERP_AGENT_KEY || "lpugpt-mock-agent";
  const portalUrl = `${opts.origin}/mock-erp/fees.html?agent=1&key=${encodeURIComponent(agentKey)}&student=${encodeURIComponent(opts.studentEmail || "student@lpu.in")}`;

  const headed = process.env.ERP_AGENT_HEADLESS !== "1";

  let browser;
  try {
    browser = await puppeteer.default.launch({
      headless: headed ? false : true,
      executablePath: chromePath(),
      defaultViewport: null,
      args: [
        "--start-maximized",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        `--app=${portalUrl}`,
      ],
    });
  } catch (err) {
    return {
      ok: false,
      message: `Could not launch Chrome for ERP agent: ${
        err instanceof Error ? err.message : String(err)
      }. Set CHROME_PATH if needed.`,
    };
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 860 });

    // Inject the user's session so /api/mock-erp/fees/pay works inside the agent browser
    if (opts.cookieHeader) {
      const originUrl = new URL(opts.origin);
      const cookies = opts.cookieHeader.split(";").map((part) => {
        const [rawName, ...rest] = part.trim().split("=");
        return {
          name: rawName.trim(),
          value: rest.join("=").trim(),
          domain: originUrl.hostname,
          path: "/",
        };
      }).filter((c) => c.name && c.value);

      if (cookies.length) {
        await page.setCookie(...cookies);
      }
    }

    await page.goto(portalUrl, { waitUntil: "networkidle2", timeout: 30_000 });
    await page.waitForSelector("#feeType", { timeout: 10_000 });

    await page.select("#feeType", opts.feeCategory);
    await page.click("#cardName", { clickCount: 3 });
    await page.type("#cardName", opts.studentName, { delay: 35 });
    await page.click("#cardNumber", { clickCount: 3 });
    await page.type("#cardNumber", "4111 1111 1111 1111", { delay: 25 });
    await page.click("#cardExpiry", { clickCount: 3 });
    await page.type("#cardExpiry", "12/28", { delay: 40 });
    await page.click("#cardCvv", { clickCount: 3 });
    await page.type("#cardCvv", "123", { delay: 40 });

    await sleep(400);
    await page.click("#payBtn");

    // Wait for receipt OR failure text
    try {
      await page.waitForSelector("#receiptBox", {
        visible: true,
        timeout: 15_000,
      });
    } catch {
      // Portal may fail auth — still screenshot + fall back to DB pay outside
      await page.screenshot({ path: shotAbs, fullPage: true });
      return {
        ok: false,
        imageUrl: `/agent-receipts/${shotName}`,
        message:
          "Browser opened the fee portal, but the on-page payment did not show a receipt (auth/network). Falling back to direct mock ERP update.",
      };
    }

    await sleep(700);
    await page.screenshot({ path: shotAbs, fullPage: true });

    const txnHint = await page.$eval("#txnId", (el) => el.textContent || "").catch(
      () => ""
    );

    // Keep window briefly so user sees the result (v1 left browser open)
    await sleep(headed ? 2500 : 200);

    return {
      ok: true,
      imageUrl: `/agent-receipts/${shotName}`,
      message: "Browser agent completed payment on Mock UMS fee portal.",
      txnHint: txnHint || undefined,
    };
  } catch (err) {
    try {
      const pages = await browser.pages();
      if (pages[0]) await pages[0].screenshot({ path: shotAbs, fullPage: true });
    } catch {
      // ignore
    }
    return {
      ok: false,
      imageUrl: `/agent-receipts/${shotName}`,
      message: `Browser agent error: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/**
 * Chat → embedded Mock UMS window (default), or external Chrome if ERP_AGENT_EXTERNAL=1.
 */
export async function runPayFeesAutomation(
  user: SessionUser,
  opts: PayFeesOptions = {}
): Promise<{
  reply: string;
  intent: string;
  blocks: UIBlock[];
}> {
  if (user.role !== "STUDENT" && user.role !== "ADMIN") {
    return {
      reply: "Fee automation is for student accounts.",
      intent: "ERP_PAY_AGENT",
      blocks: [
        {
          type: "text",
          content: "Fee automation is for student accounts.",
        },
      ],
    };
  }

  const studentId = await resolveStudentId(user);
  const student =
    (await prisma.user.findUnique({ where: { id: studentId } })) ??
    ({ name: user.name, email: user.email } as { name: string; email: string });

  let due = await prisma.feeInvoice.findMany({
    where: {
      userId: studentId,
      status: { in: ["DUE", "PARTIAL", "OVERDUE"] },
    },
    orderBy: { dueDate: "asc" },
  });

  if (!due.length) {
    await resetDemoFees(user);
    due = await prisma.feeInvoice.findMany({
      where: {
        userId: studentId,
        status: { in: ["DUE", "PARTIAL", "OVERDUE"] },
      },
      orderBy: { dueDate: "asc" },
    });
  }

  const primary = due[0];
  const feeCategory = (
    ["hostel", "exam", "tuition"].includes(primary?.category)
      ? primary.category
      : "hostel"
  ) as "hostel" | "exam" | "tuition";

  const amountDue = due.reduce((s, inv) => s + (inv.amountInr - inv.paidInr), 0);
  const agentKey = process.env.ERP_AGENT_KEY || "lpugpt-mock-agent";
  const studentEmail =
    ("email" in student && student.email) || user.email || "student@lpu.in";
  const portalPath = `/mock-erp/fees.html?agent=1&key=${encodeURIComponent(agentKey)}&student=${encodeURIComponent(studentEmail)}`;

  // Default: in-chat UMS window with approval overlays (portal stays visible)
  if (process.env.ERP_AGENT_EXTERNAL !== "1") {
    const dueLines = due.map(
      (inv) =>
        `${inv.category}: ₹${(inv.amountInr - inv.paidInr).toLocaleString("en-IN")} (${inv.status})`
    );
    return {
      reply: "Needs your approval to continue in Mock UMS.",
      intent: "ERP_PAY_CONFIRM",
      blocks: [
        {
          type: "live_browser",
          data: {
            url: portalPath,
            title: "Mock UMS · Fee Gateway",
            studentName: student.name,
            studentEmail,
            feeCategory,
            amountDue,
            dueLines,
            payAllRemaining: true,
            requireApproval: true,
          },
        },
      ],
    };
  }

  // Optional external Chrome (ERP_AGENT_EXTERNAL=1)
  const origin = appOrigin(opts.baseUrl);
  const browserResult = await driveFeePortalWithBrowser({
    studentName: student.name,
    studentEmail,
    origin,
    cookieHeader: opts.cookieHeader,
    feeCategory,
  });

  for (const inv of due) {
    const fresh = await prisma.feeInvoice.findUnique({ where: { id: inv.id } });
    if (fresh && fresh.status !== "PAID") {
      await prisma.feeInvoice.update({
        where: { id: inv.id },
        data: { paidInr: inv.amountInr, status: "PAID" },
      });
    }
  }
  const leftover = await prisma.feeInvoice.findMany({
    where: {
      userId: studentId,
      status: { in: ["DUE", "PARTIAL", "OVERDUE"] },
    },
  });
  for (const inv of leftover) {
    await prisma.feeInvoice.update({
      where: { id: inv.id },
      data: { paidInr: inv.amountInr, status: "PAID" },
    });
  }

  const invoices = await prisma.feeInvoice.findMany({
    where: { userId: studentId },
    orderBy: { dueDate: "asc" },
  });
  const totalDue = invoices.reduce((s, inv) => s + (inv.amountInr - inv.paidInr), 0);
  const amountPaid = invoices
    .filter((i) => i.status === "PAID")
    .reduce((s, inv) => s + inv.amountInr, 0);
  const txn = browserResult.txnHint || txnId();

  return {
    reply: `Paid ₹${amountPaid.toLocaleString("en-IN")}`,
    intent: "ERP_PAY_AGENT",
    blocks: [
      {
        type: "payment_result",
        data: {
          status: totalDue === 0 ? "success" : "partial",
          title: "Payment complete",
          paidLabel: `${feeCategory} via Mock UMS`,
          amountPaid,
          totalDue,
          txnId: txn,
          imageUrl: browserResult.imageUrl,
          portalUrl: "/mock-erp/fees.html",
          invoices: invoices.map((inv) => ({
            id: inv.id,
            term: inv.term,
            category: inv.category,
            amountInr: inv.amountInr,
            paidInr: inv.paidInr,
            status: inv.status,
          })),
        },
      },
    ],
  };
}
