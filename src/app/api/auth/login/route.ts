import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit, createSession, verifyPassword } from "@/lib/auth";
import { loginSchema, rateLimit } from "@/lib/security";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`login:${ip}`, 12, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  const dummyHash = "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWEgI.2.";
  const ok = user ? await verifyPassword(password, user.passwordHash) : await verifyPassword(password, dummyHash);

  if (!user || !ok) {
    await audit("LOGIN_FAILED", "auth", { detail: email, ip });
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = await createSession(user.id, {
    ip,
    userAgent: req.headers.get("user-agent"),
  });

  await audit("LOGIN", "auth", { userId: user.id, ip });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    token,
  });
}
