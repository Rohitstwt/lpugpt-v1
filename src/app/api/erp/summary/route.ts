import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { erpGetSummary } from "@/lib/erp";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const summary = await erpGetSummary(user);
  return NextResponse.json(summary);
}
