import { StyleSheet, Text, View } from "react-native";
import type { ChatBlock } from "../../api";
import { blockAccent, blockSummary } from "../../blockSummary";
import { colors, spacing } from "../../theme";
import { AssignmentSessionBlock } from "./AssignmentSessionBlock";
import { CampusNavBlock } from "./CampusNavBlock";
import { renderDataBlock } from "./DataBlocks";
import { FeeSessionBlock } from "./FeeSessionBlock";
import { LeaveSessionBlock } from "./LeaveSessionBlock";

export function ChatBlockView({
  block,
  token,
}: {
  block: ChatBlock;
  token: string;
}) {
  const data = (block.data || {}) as Record<string, unknown>;

  if (block.type === "assignment_session") {
    return <AssignmentSessionBlock data={data} token={token} />;
  }
  if (block.type === "leave_session") {
    return <LeaveSessionBlock data={data} token={token} />;
  }
  if (block.type === "live_browser") {
    return <FeeSessionBlock data={data} token={token} />;
  }
  if (block.type === "campus_nav") {
    return <CampusNavBlock data={data} token={token} />;
  }

  const rich = renderDataBlock(block);
  if (rich) return rich;

  const summary = blockSummary(block);
  if (!summary) return null;

  return (
    <View style={[styles.card, { borderColor: blockAccent(block.type) }]}>
      <Text style={styles.type}>{block.type.replace(/_/g, " ")}</Text>
      <Text style={styles.text}>{summary}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  type: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  text: { fontSize: 13, color: colors.text },
});
