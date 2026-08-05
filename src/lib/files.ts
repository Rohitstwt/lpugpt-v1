import { readFile } from "fs/promises";
import path from "path";
import { analyzeImageFile, analyzeImageWithOpenAI } from "@/lib/ai/vision";

const TEXT_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/xml",
  "text/xml",
]);

export function classifyUpload(mimeType: string, filename: string) {
  const lower = filename.toLowerCase();
  if (mimeType.startsWith("image/")) return "image" as const;
  if (mimeType.startsWith("audio/")) return "audio" as const;
  if (
    TEXT_TYPES.has(mimeType) ||
    mimeType === "application/pdf" ||
    mimeType.includes("word") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".md") ||
    lower.endsWith(".csv") ||
    lower.endsWith(".json") ||
    lower.endsWith(".pdf") ||
    lower.endsWith(".docx")
  ) {
    return "document" as const;
  }
  return "other" as const;
}

export async function extractFileText(
  storagePath: string,
  mimeType: string,
  filename: string
): Promise<string | null> {
  const abs = path.isAbsolute(storagePath)
    ? storagePath
    : path.join(process.cwd(), storagePath);
  const buf = await readFile(abs);
  const lower = filename.toLowerCase();

  if (
    TEXT_TYPES.has(mimeType) ||
    lower.endsWith(".txt") ||
    lower.endsWith(".md") ||
    lower.endsWith(".csv") ||
    lower.endsWith(".json") ||
    lower.endsWith(".xml")
  ) {
    return buf.toString("utf8").slice(0, 60_000);
  }

  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) {
    try {
      const pdfModule = (await import("pdf-parse")) as any;
      const pdfParse = (pdfModule.default || pdfModule) as (
        data: Buffer
      ) => Promise<{ text: string }>;
      const parsed = await pdfParse(buf);
      return (parsed.text || "").slice(0, 60_000);
    } catch {
      return null;
    }
  }

  if (mimeType.includes("word") || lower.endsWith(".docx")) {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: buf });
      return (result.value || "").slice(0, 60_000);
    } catch {
      return null;
    }
  }

  if (mimeType.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(lower)) {
    const local = await analyzeImageFile(storagePath, filename);
    if (local && !local.includes("Vision model not installed")) return local;
    const cloud = await analyzeImageWithOpenAI(storagePath, filename);
    if (cloud) return cloud;
    return (
      local ||
      `[Image attached: ${filename}. Could not read image content yet.]`
    );
  }

  return null;
}
