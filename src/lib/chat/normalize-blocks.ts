import type { UIBlock } from "@/types/ui-blocks";

function textFromBlocks(blocks: UIBlock[]): string {
  return blocks
    .filter((b) => b.type === "text")
    .map((b) => (b as { content: string }).content)
    .join("\n\n")
    .trim();
}

/**
 * Keep the answer and supporting cards together. Cards alone are hard to interpret,
 * especially in compact clients.
 */
export function normalizeChatBlocks(
  reply: string,
  blocks: UIBlock[] = []
): { reply: string; blocks: UIBlock[] } {
  const rich = blocks.filter((b) => b.type !== "text");
  const text = (reply?.trim() || textFromBlocks(blocks)).trim();

  if (rich.length > 0) {
    return { reply: text, blocks: rich };
  }

  if (!text) {
    return { reply: "", blocks: [] };
  }

  return {
    reply: text,
    blocks: [{ type: "text", content: text }],
  };
}
