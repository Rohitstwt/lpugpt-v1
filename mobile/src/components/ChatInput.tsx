import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, spacing } from "../theme";

export function ChatInput({
  value,
  onChangeText,
  onSend,
  loading,
  disabled,
  onFocus,
  compact,
}: {
  value: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
  loading: boolean;
  disabled?: boolean;
  onFocus?: () => void;
  compact?: boolean;
}) {
  const canSend = value.trim().length > 0 && !loading && !disabled;

  return (
    <View style={styles.wrap}>
      <View style={styles.pill}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          placeholder="Message LPUGPT"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={2000}
          editable={!disabled}
          returnKeyType="default"
          blurOnSubmit={false}
        />
        <Pressable
          style={[styles.send, canSend && styles.sendActive]}
          onPress={onSend}
          disabled={!canSend}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text style={[styles.sendIcon, canSend && styles.sendIconActive]}>↑</Text>
          )}
        </Pressable>
      </View>
      {!compact && (
        <Text style={styles.hint}>
          LPUGPT can make mistakes. Verify important info.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    backgroundColor: colors.bg,
  },
  pill: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.inputBg,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 52,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 120,
    paddingVertical: 8,
    paddingRight: 8,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    marginBottom: 2,
  },
  sendActive: {
    backgroundColor: colors.text,
  },
  sendIcon: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textMuted,
    marginTop: -1,
  },
  sendIconActive: {
    color: colors.bg,
  },
  hint: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
    opacity: 0.7,
  },
});
