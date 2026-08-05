import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

/** Clears a stale browser session cookie, then sends the user to login. */
export async function GET(req: NextRequest) {
  await destroySession();
  const login = new URL("/login", req.url);
  const next = req.nextUrl.searchParams.get("next");
  if (next?.startsWith("/")) login.searchParams.set("next", next);
  else login.searchParams.set("next", "/app");
  return NextResponse.redirect(login);
}
