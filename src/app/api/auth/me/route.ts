import { NextRequest, NextResponse } from "next/server";
import { audit, destroySessionFromToken, getCurrentUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}
