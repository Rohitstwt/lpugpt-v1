import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, spacing } from "../../theme";

type Phase = "awaiting" | "running" | "done" | "error" | "cancelled";

export function ApprovalShell({
  badge,
  title,
  subtitle,
  details,
  phase,
  error,
  doneTitle,
  doneSubtitle,
  onAllow,
  onSkip,
  onRetry,
  allowLabel = "Allow",
  skipLabel = "Skip",
  accent = colors.orange,
  children,
}: {
  badge: string;
  title: string;
  subtitle?: string;
  details: { label: string; value: string }[];
  phase: Phase;
  error?: string | null;
  doneTitle?: string;
  doneSubtitle?: string;
  onAllow: () => void;
  onSkip: () => void;
  onRetry?: () => void;
  allowLabel?: string;
  skipLabel?: string;
  accent?: string;
  children?: ReactNode;
}) {
  const busy = phase === "running";

  return (
    <View style={[styles.card, { borderColor: accent }]}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: `${accent}22` }]}>
          <Text style={[styles.badgeText, { color: accent }]}>{badge}</Text>
        </View>
        {busy && <ActivityIndicator size="small" color={accent} />}
        {phase === "done" && <Text style={styles.doneIcon}>✓</Text>}
        {phase === "error" && <Text style={styles.errorIcon}>!</Text>}
      </View>

      <Text style={styles.title}>
        {phase === "done" ? doneTitle || title : title}
      </Text>
      {phase === "done" && doneSubtitle ? (
        <Text style={styles.subtitle}>{doneSubtitle}</Text>
      ) : subtitle ? (
        <Text style={styles.subtitle}>{subtitle}</Text>
      ) : null}

      {phase !== "done" && phase !== "cancelled" && (
        <View style={styles.details}>
          {details.map((row) => (
            <View key={row.label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {phase === "awaiting" && (
        <View style={styles.actions}>
          <Pressable
            style={[styles.allowBtn, { backgroundColor: accent }]}
            onPress={onAllow}
          >
            <Text style={styles.allowText}>{allowLabel}</Text>
          </Pressable>
          <Pressable style={styles.skipBtn} onPress={onSkip}>
            <Text style={styles.skipText}>{skipLabel}</Text>
          </Pressable>
        </View>
      )}

      {phase === "error" && onRetry && (
        <View style={styles.actions}>
          <Pressable
            style={[styles.allowBtn, { backgroundColor: accent }]}
            onPress={onRetry}
          >
            <Text style={styles.allowText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {phase === "cancelled" && (
        <Text style={styles.cancelledText}>Cancelled. No changes were made.</Text>
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  doneIcon: { color: colors.success, fontSize: 18, fontWeight: "700" },
  errorIcon: { color: colors.danger, fontSize: 18, fontWeight: "700" },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  details: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: 6,
  },
  detailRow: { gap: 2 },
  detailLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailValue: { fontSize: 13, color: colors.text, fontWeight: "500" },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  actions: { flexDirection: "row", gap: 8 },
  allowBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  allowText: { color: "#0a0a0a", fontWeight: "700", fontSize: 14 },
  skipBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  skipText: { color: colors.textMuted, fontWeight: "600", fontSize: 14 },
  cancelledText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: "italic",
  },
});
