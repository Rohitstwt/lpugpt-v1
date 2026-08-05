import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC = new Set(["/", "/login", "/register"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/campus") ||
    pathname.startsWith("/api/mock-erp/fees/agent-pay") ||
    pathname.startsWith("/api/mock-erp/assignments/agent-submit") ||
    pathname.includes(".") // static assets
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("lpugpt_session")?.value;
  const isApp = pathname.startsWith("/app") || pathname.startsWith("/api/");

  if (PUBLIC.has(pathname) && !isApp) {
    // Do not auto-bounce /login → /app from JWT alone.
    // JWT can still verify after DB sessions were wiped (e.g. seed),
    // which caused ERR_TOO_MANY_REDIRECTS with /app page auth.
    return NextResponse.next();
  }

  // After DB seed / session wipe, JWT can still exist but DB session is gone.
  // Treat that as logged-out for APIs so the UI can clear the cookie.
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  try {
    const secret = process.env.AUTH_SECRET;
    if (!secret || secret.length < 16) {
      throw new Error("missing secret");
    }
    await jwtVerify(token, new TextEncoder().encode(secret));
    return NextResponse.next();
  } catch {
    const res = pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("lpugpt_session");
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
