import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getCurrentUser, audit } from "@/lib/auth";
import { rateLimit } from "@/lib/security";

export const runtime = "nodejs";

/**
 * Whisper-style speech → text.
 * Prefers OpenAI Whisper when OPENAI_API_KEY is set.
 * Otherwise returns mode:"browser" so the client uses live Web Speech dictation.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(`transcribe:${user.id}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many transcriptions." }, { status: 429 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      mode: "browser",
      text: "",
      message:
        "Live dictation runs in your browser (Wispr-style). For server Whisper, set OPENAI_API_KEY.",
    });
  }

  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "audio is required" }, { status: 400 });
  }
  if (audio.size > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "Audio too large (max 12MB)." }, { status: 400 });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const transcription = await client.audio.transcriptions.create({
      file: audio,
      model: process.env.WHISPER_MODEL || "whisper-1",
      language: "en",
    });

    await audit("TRANSCRIBE", "audio", {
      userId: user.id,
      detail: `chars:${transcription.text.length}`,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    });

    return NextResponse.json({
      mode: "whisper",
      text: transcription.text.trim(),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "transcription failed";
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
