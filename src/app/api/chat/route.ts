import { NextRequest, NextResponse } from "next/server";
import { audit, getCurrentUserFromRequest } from "@/lib/auth";
import { runOrchestrator } from "@/lib/ai/orchestrator";
import { runChat } from "@/lib/ai/chat-engine";
import { isPayFeesCommand, isResetFeesCommand, isSubmitAssignmentCommand, isApplyLeaveCommand, resetDemoFees, runPayFeesAutomation, runSubmitAssignmentAutomation, runApplyLeaveAutomation } from "@/lib/ai/mock-ums-agent";
import { prisma } from "@/lib/db";
import { chatSchema, rateLimit } from "@/lib/security";
import type { UIBlock } from "@/types/ui-blocks";
import { normalizeChatBlocks } from "@/lib/chat/normalize-blocks";

type ChatPayload = {
  reply: string;
  intent: string;
  blocks?: UIBlock[];
  meshEvent?: Awaited<ReturnType<typeof runChat>>["meshEvent"];
};

function shouldUseCampusCards(message: string) {
  const lower = message.toLowerCase();
  const asksForOwnData = /\b(my|show|view|list|open|check|calculate)\b/.test(lower);

  return (
    /\b(show|open|view)\s+(?:the\s+)?(?:campus\s+)?map\b/i.test(message) ||
    /\b(?:from|go from)\s+.+?\s+(?:to|→)\s+.+/i.test(message) ||
    /\b(?:where is|navigate|directions? to)\b/i.test(message) ||
    (asksForOwnData &&
      /\b(attendance|fee|fees|dues|grades?|results?|cgpa|sgpa|assignments?|timetable|schedule)\b/i.test(
        message
      )) ||
    /\b(upcoming\s+)?(?:campus\s+)?events?\b/i.test(message) ||
    /\b(?:recent\s+)?notices?\b/i.test(message) ||
    /\b(?:faculty|teacher)\s+(?:directory|list)\b/i.test(message)
  );
}

function packChat(payload: ChatPayload): ChatPayload {
  const { reply, blocks } = normalizeChatBlocks(
    payload.reply,
    payload.blocks ?? []
  );
  return { ...payload, reply, blocks };
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`chat:${user.id}`, 40, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Slow down — too many messages." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const message = parsed.data.message;
  const attachmentIds = parsed.data.attachmentIds ?? [];

  let attachmentContext = "";
  let directImageReply: string | null = null;
  if (attachmentIds.length) {
    const files = await prisma.uploadedFile.findMany({
      where: { id: { in: attachmentIds }, userId: user.id },
    });

    if (!files.length) {
      return NextResponse.json(
        {
          error:
            "Those attachments were not found for your account. Re-upload the image while logged in, then ask again.",
        },
        { status: 404 }
      );
    }

    const { answerQuestionAboutImage, answerFromStoredImageText } = await import(
      "@/lib/ai/vision"
    );
    const parts: string[] = [];
    const images = files.filter((f) => f.kind === "image");
    const others = files.filter((f) => f.kind !== "image");

    for (const f of images) {
      // Prefer stored OCR/analysis (fast). Re-read the image only if we never extracted text.
      const hasAnalysis =
        Boolean(f.extractedText) &&
        f.extractedText!.length > 80 &&
        !f.extractedText!.includes("Vision model not installed") &&
        !f.extractedText!.includes("Could not OCR");

      const live = hasAnalysis
        ? await answerFromStoredImageText(f.extractedText!, f.filename, message)
        : await answerQuestionAboutImage(f.storagePath, f.filename, message);

      if (live) {
        parts.push(`--- IMAGE Q&A: ${f.filename} ---\n${live}`);
        directImageReply = live;
        if (!hasAnalysis) {
          await prisma.uploadedFile.update({
            where: { id: f.id },
            data: { extractedText: `IMAGE ANALYSIS (${f.filename}):\n${live}` },
          });
        }
      } else {
        const text =
          f.extractedText?.slice(0, 12_000) || "(could not read image text)";
        parts.push(`--- FILE: ${f.filename} (${f.kind}, ${f.mimeType}) ---\n${text}`);
      }
    }

    if (!directImageReply) {
      for (const f of others) {
        const text = f.extractedText?.slice(0, 12_000) || "(no extractable text)";
        parts.push(`--- FILE: ${f.filename} (${f.kind}, ${f.mimeType}) ---\n${text}`);
      }
    }

    attachmentContext = parts.join("\n\n");
  }

  const storedUserContent = attachmentIds.length
    ? `${message}\n\n[attachments: ${attachmentIds.length}]`
    : message;

  await prisma.chatMessage.create({
    data: { userId: user.id, role: "user", content: storedUserContent },
  });

  // Image questions: return vision answer directly (don't let chat model ignore the photo)
  if (directImageReply) {
    const reply = directImageReply;
    const packed = packChat({
      reply,
      intent: "IMAGE_QA",
      blocks: [{ type: "text", content: reply }],
    });
    await prisma.chatMessage.create({
      data: {
        userId: user.id,
        role: "assistant",
        content: packed.reply,
        intent: packed.intent,
        metadata: JSON.stringify({ blocks: packed.blocks }),
      },
    });
    await audit("CHAT", "chat", {
      userId: user.id,
      detail: "IMAGE_QA",
      ip,
    });
    return NextResponse.json(packed);
  }

  // Demo: "reset my fees" restores unpaid invoices so pay automation can re-run
  if (isResetFeesCommand(message) && !attachmentContext) {
    await resetDemoFees(user);
    const reply =
      "Demo fees restored — hostel (partial) + exam (due) are unpaid again. Say **pay my fees** to re-run the agent.";
    const packed = packChat({
      reply,
      intent: "ERP_RESET_FEES",
      blocks: [{ type: "text", content: reply }],
    });
    await prisma.chatMessage.create({
      data: {
        userId: user.id,
        role: "assistant",
        content: packed.reply,
        intent: packed.intent,
        metadata: JSON.stringify({ blocks: packed.blocks }),
      },
    });
    return NextResponse.json(packed);
  }

  // Submit assignment before deadline — approval + live Mock UMS
  if (isSubmitAssignmentCommand(message) && !attachmentContext) {
    try {
      const result = packChat(await runSubmitAssignmentAutomation(user, message));
      await prisma.chatMessage.create({
        data: {
          userId: user.id,
          role: "assistant",
          content: result.reply,
          intent: result.intent,
          metadata: JSON.stringify({ blocks: result.blocks }),
        },
      });
      await audit("CHAT", "chat", {
        userId: user.id,
        detail: result.intent,
        ip,
      });
      return NextResponse.json(result);
    } catch (err) {
      console.error("assignment agent failed", err);
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : "Assignment agent failed. Try again.",
        },
        { status: 500 }
      );
    }
  }

  // Apply for leave — approval + live Mock UMS
  if (isApplyLeaveCommand(message) && !attachmentContext) {
    try {
      const result = packChat(await runApplyLeaveAutomation(user, message));
      await prisma.chatMessage.create({
        data: {
          userId: user.id,
          role: "assistant",
          content: result.reply,
          intent: result.intent,
          metadata: JSON.stringify({ blocks: result.blocks }),
        },
      });
      await audit("CHAT", "chat", {
        userId: user.id,
        detail: result.intent,
        ip,
      });
      return NextResponse.json(result);
    } catch (err) {
      console.error("leave agent failed", err);
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : "Leave agent failed. Try again.",
        },
        { status: 500 }
      );
    }
  }

  // v1-style: "pay my fees" → full mock UMS automation (before generic fee card)
  if (isPayFeesCommand(message) && !attachmentContext) {
    const origin = req.nextUrl.origin || "http://localhost:3000";
    const paid = packChat(
      await runPayFeesAutomation(user, {
        baseUrl: origin,
        cookieHeader: req.headers.get("cookie") || undefined,
      })
    );
    await prisma.chatMessage.create({
      data: {
        userId: user.id,
        role: "assistant",
        content: paid.reply,
        intent: paid.intent,
        metadata: JSON.stringify({ blocks: paid.blocks }),
      },
    });
    await audit("CHAT", "chat", {
      userId: user.id,
      detail: paid.intent,
      ip,
    });
    return NextResponse.json(paid);
  }

  let result: ChatPayload;

  if (shouldUseCampusCards(message) && !attachmentContext) {
    const orchestrated = await runOrchestrator(user, message);
    result = packChat({
      reply: orchestrated.reply,
      intent: orchestrated.intent,
      blocks: orchestrated.blocks,
    });
  } else {
    const chatResult = await runChat(user, message, { attachmentContext });
    result = packChat({
      reply: chatResult.reply,
      intent: chatResult.intent,
      meshEvent: chatResult.meshEvent,
      blocks: [{ type: "text", content: chatResult.reply }],
    });
  }

  await prisma.chatMessage.create({
    data: {
      userId: user.id,
      role: "assistant",
      content: result.reply,
      intent: result.intent,
      metadata: JSON.stringify({
        blocks: result.blocks,
        meshEvent: result.meshEvent,
      }),
    },
  });

  await audit("CHAT", "chat", {
    userId: user.id,
    detail: result.intent,
    ip,
  });

  return NextResponse.json(result);
}
