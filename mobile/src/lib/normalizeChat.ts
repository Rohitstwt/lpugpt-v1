import type { ChatBlock } from "../api";

export function normalizeAssistantMessage(
  reply: string,
  blocks?: ChatBlock[]
): { text: string; blocks: ChatBlock[] } {
  const list = blocks ?? [];
  const rich = list.filter((b) => b.type !== "text");

  const fromBlocks = list
    .filter((b) => b.type === "text" && b.content)
    .map((b) => b.content!)
    .join("\n\n")
    .trim();

  const text = (reply?.trim() || fromBlocks).trim();
  return { text, blocks: rich };
}
