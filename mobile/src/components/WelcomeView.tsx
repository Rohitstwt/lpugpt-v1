import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../theme";

const ICONS: Record<string, string> = {
  fees: "₹",
  assignment: "📄",
  leave: "🏥",
  map: "🗺",
  nav: "🧭",
  teacher: "📢",
  courses: "📚",
  events: "📅",
};

function iconFor(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes("fee")) return ICONS.fees;
  if (lower.includes("assignment") || lower.includes("submit")) return ICONS.assignment;
  if (lower.includes("leave")) return ICONS.leave;
  if (lower.includes("map")) return ICONS.map;
  if (lower.includes("block") || lower.includes("go from")) return ICONS.nav;
  if (lower.includes("announcement")) return ICONS.teacher;
  if (lower.includes("course")) return ICONS.courses;
  if (lower.includes("event")) return ICONS.events;
  return "✦";
}

export function SuggestionCard({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <Text style={styles.icon}>{iconFor(label)}</Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

export function WelcomeView({
  name,
  suggestions,
  onSuggestion,
}: {
  name: string;
  suggestions: string[];
  onSuggestion: (text: string) => void;
}) {
  const first = name.split(" ")[0] || name;

  return (
    <View style={styles.wrap}>
      <Text style={styles.greeting}>Hello, {first}</Text>
      <Text style={styles.sub}>How may I assist you today?</Text>
      <View style={styles.grid}>
        {suggestions.map((s) => (
          <SuggestionCard key={s} label={s} onPress={() => onSuggestion(s)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  sub: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  card: {
    width: "48%",
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardPressed: {
    backgroundColor: colors.surfaceHover,
    borderColor: colors.border,
  },
  icon: {
    fontSize: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
