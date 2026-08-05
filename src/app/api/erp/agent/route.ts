import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runErpAgent } from "@/lib/ai/erp-agent";
import { rateLimit } from "@/lib/security";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(`erp-agent:${user.id}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many agent runs." }, { status: 429 });
  }

  let goal = "Run ERP semester checkup";
  try {
    const body = (await req.json()) as { goal?: string };
    if (body.goal?.trim()) goal = body.goal.trim();
  } catch {
    // default goal
  }

  const result = await runErpAgent(user, goal);
  if (!result) {
    // Force checkup workflow
    const forced = await runErpAgent(user, "automate erp semester checkup");
    return NextResponse.json(forced);
  }
  return NextResponse.json(result);
}
