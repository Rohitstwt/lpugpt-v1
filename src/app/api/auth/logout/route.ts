import { NextRequest, NextResponse } from "next/server";
import { audit, destroySession, getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  await destroySession();
  if (user) {
    await audit("LOGOUT", "auth", { userId: user.id, ip });
  }
  return NextResponse.json({ ok: true });
}
