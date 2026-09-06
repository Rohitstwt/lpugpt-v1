import { NextRequest, NextResponse } from "next/server";
import { audit, destroySessionFromToken, getCurrentUserFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  await destroySessionFromToken(bearer);
  if (user) {
    await audit("LOGOUT", "auth", { userId: user.id, ip });
  }
  return NextResponse.json({ ok: true });
}
