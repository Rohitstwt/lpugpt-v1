import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getCurrentUser, audit } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { classifyUpload, extractFileText } from "@/lib/files";
import { rateLimit } from "@/lib/security";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "audio/webm",
  "audio/wav",
  "audio/mpeg",
  "audio/mp4",
];

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(`upload:${user.id}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many uploads." }, { status: 429 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be under 8MB." }, { status: 400 });
  }

  const mimeType = file.type || "application/octet-stream";
  const filename = file.name.slice(0, 180);
  const lower = filename.toLowerCase();
  const okExt =
    ALLOWED.includes(mimeType) ||
    /\.(txt|md|csv|json|pdf|docx|png|jpe?g|webp|gif|webm|wav|mp3|m4a)$/i.test(lower);
  if (!okExt) {
    return NextResponse.json(
      { error: "Unsupported file type. Use text, PDF, DOCX, images, or audio." },
      { status: 400 }
    );
  }

  const kind = classifyUpload(mimeType, filename);
  const dir = path.join(process.cwd(), "uploads", user.id);
  await mkdir(dir, { recursive: true });
  const safeName = `${Date.now()}-${nanoid(8)}-${filename.replace(/[^\w.\-]+/g, "_")}`;
  const storagePath = path.join("uploads", user.id, safeName);
  const abs = path.join(process.cwd(), storagePath);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(abs, bytes);

  let extractedText: string | null = null;
  try {
    extractedText = await extractFileText(storagePath, mimeType, filename);
  } catch {
    extractedText = null;
  }

  const row = await prisma.uploadedFile.create({
    data: {
      userId: user.id,
      filename,
      mimeType,
      size: file.size,
      kind,
      storagePath,
      extractedText,
    },
  });

  await audit("UPLOAD", "file", {
    userId: user.id,
    detail: `${kind}:${filename}`,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  });

  return NextResponse.json({
    id: row.id,
    filename: row.filename,
    mimeType: row.mimeType,
    size: row.size,
    kind: row.kind,
    hasText: Boolean(row.extractedText && row.extractedText.length > 0),
    preview: row.extractedText?.slice(0, 280) ?? null,
  });
}
