import { getCurrentUser } from "@/lib/auth";
import { getRecentMeshEvents, subscribeMesh, type MeshEvent } from "@/lib/mesh";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send("hello", { ok: true, user: user.name, role: user.role });

      for (const event of getRecentMeshEvents(10).reverse()) {
        send("mesh", event);
      }

      cleanup = subscribeMesh(user.id, (event: MeshEvent) => {
        send("mesh", event);
      });

      heartbeat = setInterval(() => {
        try {
          send("ping", { t: Date.now() });
        } catch {
          if (heartbeat) clearInterval(heartbeat);
          cleanup?.();
        }
      }, 15000);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
