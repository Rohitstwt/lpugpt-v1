import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ChatBlock } from "../../api";
import { openGoogleMapsWalking } from "../../lib/appLinks";
import { colors, spacing } from "../../theme";

function CardShell({
  badge,
  accent,
  children,
}: {
  badge: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <View style={[styles.card, { borderColor: accent }]}>
      <Text style={[styles.badge, { color: accent }]}>{badge}</Text>
      {children}
    </View>
  );
}

export function FeeCardBlock({ data }: { data: Record<string, unknown> }) {
  const invoices = (data.invoices as Array<{
    term: string;
    category: string;
    amountInr: number;
    status: string;
  }>) ?? [];
  const totalDue = data.totalDue as number | undefined;

  return (
    <CardShell badge="Fees" accent={colors.orange}>
      {totalDue !== undefined && (
        <Text style={styles.headline}>
          {totalDue > 0
            ? `₹${totalDue.toLocaleString("en-IN")} due`
            : "All clear"}
        </Text>
      )}
      {invoices.map((inv, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowTitle}>{inv.category}</Text>
            <Text style={styles.rowSub}>{inv.term}</Text>
          </View>
          <Text style={styles.rowValue}>
            ₹{inv.amountInr.toLocaleString("en-IN")} · {inv.status}
          </Text>
        </View>
      ))}
    </CardShell>
  );
}

export function AttendanceCardBlock({ data }: { data: Record<string, unknown> }) {
  const present = data.present as number;
  const total = data.total as number;
  const pct = data.percentage as number;
  const course = (data.courseCode as string) || (data.courseName as string) || "Overall";

  return (
    <CardShell badge="Attendance" accent="#3b82f6">
      <Text style={styles.headline}>{course}</Text>
      <Text style={styles.statLine}>
        {present}/{total} classes · {pct}%
      </Text>
    </CardShell>
  );
}

export function GradesCardBlock({ data }: { data: Record<string, unknown> }) {
  const rows = (data.rows as Array<{
    courseCode: string;
    grade: string;
    marks?: number | null;
  }>) ?? [];
  const term = data.term as string | undefined;

  return (
    <CardShell badge="Grades" accent="#a855f7">
      {term && <Text style={styles.headline}>{term}</Text>}
      {rows.map((r, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.rowTitle}>{r.courseCode}</Text>
          <Text style={styles.rowValue}>
            {r.grade}
            {r.marks != null ? ` · ${r.marks}` : ""}
          </Text>
        </View>
      ))}
    </CardShell>
  );
}

export function AssignmentsCardBlock({ data }: { data: Record<string, unknown> }) {
  const tasks = (data.tasks as Array<{
    courseCode: string;
    title: string;
    dueLabel: string;
    status: string;
  }>) ?? [];

  return (
    <CardShell badge="Assignments" accent="#3b82f6">
      {tasks.map((t, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowTitle}>
              {t.courseCode} · {t.title}
            </Text>
            <Text style={styles.rowSub}>{t.dueLabel}</Text>
          </View>
          <Text style={styles.rowValue}>{t.status}</Text>
        </View>
      ))}
    </CardShell>
  );
}

export function RouteCardBlock({ data }: { data: Record<string, unknown> }) {
  const steps = (data.steps as string[]) ?? [];
  const toLat = data.toLat as number | undefined;
  const toLng = data.toLng as number | undefined;
  const fromLat = data.fromLat as number | undefined;
  const fromLng = data.fromLng as number | undefined;

  return (
    <CardShell badge="Route" accent="#22c55e">
      <Text style={styles.headline}>
        {data.from as string} → {data.to as string}
      </Text>
      <Text style={styles.statLine}>
        {data.distance as string} · {data.duration as string}
      </Text>
      {steps.slice(0, 4).map((s, i) => (
        <Text key={i} style={styles.step}>
          {i + 1}. {s}
        </Text>
      ))}
      {toLat != null && toLng != null && (
        <Pressable
          style={styles.mapsBtn}
          onPress={() =>
            void openGoogleMapsWalking(
              { lat: toLat, lng: toLng, label: String(data.to) },
              fromLat != null && fromLng != null
                ? { lat: fromLat, lng: fromLng }
                : null
            )
          }
        >
          <Text style={styles.mapsBtnText}>Open in Google Maps</Text>
        </Pressable>
      )}
    </CardShell>
  );
}

export function PaymentResultBlock({ data }: { data: Record<string, unknown> }) {
  return (
    <CardShell badge="Payment" accent={colors.success}>
      <Text style={styles.headline}>{data.title as string}</Text>
      <Text style={styles.statLine}>{data.paidLabel as string}</Text>
      {typeof data.txnId === "string" && (
        <Text style={styles.rowSub}>Txn {data.txnId}</Text>
      )}
    </CardShell>
  );
}

export function renderDataBlock(block: ChatBlock) {
  const data = (block.data || {}) as Record<string, unknown>;
  switch (block.type) {
    case "fee_card":
      return <FeeCardBlock data={data} />;
    case "attendance_card":
      return <AttendanceCardBlock data={data} />;
    case "grades_card":
      return <GradesCardBlock data={data} />;
    case "assignments_card":
      return <AssignmentsCardBlock data={data} />;
    case "route_card":
      return <RouteCardBlock data={data} />;
    case "payment_result":
      return <PaymentResultBlock data={data} />;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  badge: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  headline: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLine: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    gap: 8,
  },
  rowLeft: { flex: 1 },
  rowTitle: { fontSize: 14, color: colors.text, fontWeight: "500" },
  rowSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  rowValue: { fontSize: 13, color: colors.textSecondary },
  step: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginTop: 4 },
  mapsBtn: {
    marginTop: spacing.sm,
    backgroundColor: "#22c55e",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  mapsBtnText: { color: "#0a0a0a", fontWeight: "700", fontSize: 14 },
});
