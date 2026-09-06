import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ChatBlock } from "../api";
import { ChatBlockView } from "./blocks/ChatBlockView";
import { colors, spacing, typography } from "../theme";

export type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  blocks?: ChatBlock[];
};

function MessageBubbleInner({
  item,
  token,
}: {
  item: Message;
  token: string;
}) {
  const isUser = item.role === "user";

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{item.text}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.assistantRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>L</Text>
      </View>
      <View style={styles.assistantContent}>
        {item.text ? (
          <Text style={styles.assistantText}>{item.text}</Text>
        ) : null}
        {item.blocks?.map((block, i) => (
          <ChatBlockView key={`${item.id}-b-${i}`} block={block} token={token} />
        ))}
      </View>
    </View>
  );
}

export const MessageBubble = memo(MessageBubbleInner);

const styles = StyleSheet.create({
  userRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignItems: "flex-end",
  },
  userBubble: {
    maxWidth: "85%",
    backgroundColor: colors.userBubble,
    borderRadius: 20,
    borderBottomRightRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userText: {
    ...typography.body,
    color: colors.text,
  },
  assistantRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.orange,
  },
  assistantContent: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  assistantText: {
    ...typography.body,
    color: colors.text,
  },
});
