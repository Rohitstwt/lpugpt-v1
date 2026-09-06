import { describe, expect, it } from "vitest";
import {
  loginSchema,
  rateLimit,
  registerSchema,
  sanitizeText,
  sha256,
} from "@/lib/security";

describe("sanitizeText", () => {
  it("strips control characters and trims", () => {
    expect(sanitizeText("  hello\u0000world  ")).toBe("helloworld");
  });

  it("enforces max length", () => {
    expect(sanitizeText("a".repeat(3000), 100)).toHaveLength(100);
  });
});

describe("sha256", () => {
  it("returns stable hex digest", () => {
    expect(sha256("test")).toBe(
      "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
    );
  });
});

describe("loginSchema", () => {
  it("accepts valid email and password", () => {
    const parsed = loginSchema.safeParse({
      email: "Student@LPU.in",
      password: "Student123!",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("student@lpu.in");
    }
  });

  it("rejects invalid email", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(
      false
    );
  });
});

describe("registerSchema", () => {
  it("requires strong password", () => {
    expect(
      registerSchema.safeParse({
        email: "a@b.com",
        password: "weak",
        name: "Test User",
      }).success
    ).toBe(false);
  });
});

describe("rateLimit", () => {
  it("allows requests under limit", () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    const first = rateLimit(key, 3, 60_000);
    expect(first.ok).toBe(true);
    expect(first.remaining).toBe(2);
  });

  it("blocks after limit exceeded", () => {
    const key = `test-block-${Date.now()}-${Math.random()}`;
    rateLimit(key, 2, 60_000);
    rateLimit(key, 2, 60_000);
    const third = rateLimit(key, 2, 60_000);
    expect(third.ok).toBe(false);
    expect(third.remaining).toBe(0);
  });
});
