import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { z } from "zod";

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function sanitizeText(input: string, max = 2000): string {
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.AUTH_SECRET ?? "lpugpt";
  return sha256(`${salt}:ip:${ip}`);
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000
): { ok: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const bucket = rateBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count, retryAfterMs: 0 };
}

export const registerSchema = z.object({
  email: z.string().email().max(120).transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[A-Za-z]/, "Password must include a letter")
    .regex(/[0-9]/, "Password must include a number"),
  name: z.string().min(2).max(80).transform((v) => sanitizeText(v, 80)),
  role: z.enum(["STUDENT", "TEACHER"]).default("STUDENT"),
  studentId: z.string().max(40).optional().nullable(),
  department: z.string().max(80).optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().email().max(120).transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1).max(128),
});

export const chatSchema = z.object({
  message: z.string().min(1).max(8000).transform((v) => sanitizeText(v, 8000)),
  attachmentIds: z.array(z.string().cuid()).max(5).optional().default([]),
});
