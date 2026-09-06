import type { ChatBlock } from "./api";
import { colors } from "./theme";

export function blockSummary(block: ChatBlock): string | null {
  switch (block.type) {
    case "text":
      return block.content ?? null;
    case "fee_card":
      const due = block.data?.totalDue as number | undefined;
      return due != null ? `Fee dues: ₹${due.toLocaleString("en-IN")}` : "Fee summary";
    case "attendance_card":
      return "Attendance summary";
    case "grades_card":
      return "Your grades";
    case "assignments_card":
      return "Assignments";
    case "payment_result":
      return (block.data?.title as string) || "Payment result";
    default:
      return null;
  }
}

export function blockAccent(type: string): string {
  if (type.includes("fee") || type === "payment_result") return colors.orange;
  if (type.includes("attendance")) return "#3b82f6";
  if (type.includes("nav") || type === "campus_nav") return "#22c55e";
  return colors.surface;
}
