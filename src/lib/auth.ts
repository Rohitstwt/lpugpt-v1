import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateToken, hashIp, sha256 } from "@/lib/security";

export type Role = "STUDENT" | "TEACHER" | "ADMIN";

const COOKIE_NAME = "lpugpt_session";
const SESSION_DAYS = 7;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  studentId: string | null;
  department: string | null;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET must be set to a strong value (16+ chars)");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    studentId: user.studentId,
    department: user.department,
  };
}

export async function createSession(
  userId: string,
  meta?: { ip?: string | null; userAgent?: string | null }
) {
  const rawToken = generateToken(48);
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      ipHash: hashIp(meta?.ip),
      userAgent: meta?.userAgent?.slice(0, 200) ?? null,
    },
  });

  const jwt = await new SignJWT({ sid: tokenHash, uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());

  const jar = await cookies();
  jar.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return jwt;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecret());
      const sid = typeof payload.sid === "string" ? payload.sid : null;
      if (sid) {
        await prisma.session.deleteMany({ where: { tokenHash: sid } });
      }
    } catch {
      // ignore invalid cookie
    }
  }
  jar.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return userFromJwt(token);
}

export async function userFromJwt(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sid = typeof payload.sid === "string" ? payload.sid : null;
    const uid = typeof payload.uid === "string" ? payload.uid : null;
    if (!sid || !uid) return null;

    const session = await prisma.session.findUnique({
      where: { tokenHash: sid },
      include: { user: true },
    });

    if (!session || session.userId !== uid || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      }
      return null;
    }

    return toSessionUser(session.user);
  } catch {
    return null;
  }
}

export async function getCurrentUserFromRequest(
  req: { headers: { get(name: string): string | null } }
): Promise<SessionUser | null> {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return userFromJwt(auth.slice(7).trim());
  }
  return getCurrentUser();
}

export async function destroySessionFromToken(token?: string | null) {
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecret());
      const sid = typeof payload.sid === "string" ? payload.sid : null;
      if (sid) {
        await prisma.session.deleteMany({ where: { tokenHash: sid } });
      }
    } catch {
      // ignore
    }
  }
  await destroySession();
}

export function requireRole(user: SessionUser, roles: Role[]) {
  if (!roles.includes(user.role)) {
    const err = new Error("Forbidden");
    (err as Error & { status: number }).status = 403;
    throw err;
  }
}

export async function audit(
  action: string,
  resource: string,
  opts?: { userId?: string | null; detail?: string; ip?: string | null }
) {
  await prisma.auditLog.create({
    data: {
      action,
      resource,
      userId: opts?.userId ?? null,
      detail: opts?.detail?.slice(0, 1000) ?? null,
      ipHash: hashIp(opts?.ip),
    },
  });
}
