import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Location from "expo-location";
import { WebView } from "react-native-webview";
import { fetchDirections } from "../../api";
import { openGoogleMapsWalking } from "../../lib/appLinks";
import {
  parseOsrmStep,
  YOUR_LOCATION_ID,
  type CampusPlace,
  type RouteStep,
} from "../../lib/geo";
import { buildMapHtml } from "../../lib/mapHtml";
import { colors, spacing } from "../../theme";

type Data = {
  places?: CampusPlace[];
  fromId?: string;
  toId?: string;
  title?: string;
};

function PlacePicker({
  visible,
  places,
  title,
  showYourLocation,
  onSelect,
  onClose,
}: {
  visible: boolean;
  places: CampusPlace[];
  title: string;
  showYourLocation?: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return places.slice(0, 80);
    return places
      .filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.category.toLowerCase().includes(term)
      )
      .slice(0, 80);
  }, [places, q]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={pickerStyles.root}>
        <View style={pickerStyles.header}>
          <Text style={pickerStyles.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={pickerStyles.close}>Done</Text>
          </Pressable>
        </View>
        <TextInput
          style={pickerStyles.search}
          placeholder="Search places…"
          placeholderTextColor={colors.textMuted}
          value={q}
          onChangeText={setQ}
          autoFocus
        />
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            showYourLocation ? (
              <Pressable
                style={pickerStyles.row}
                onPress={() => {
                  onSelect(YOUR_LOCATION_ID);
                  onClose();
                  setQ("");
                }}
              >
                <Text style={pickerStyles.rowName}>📍 Your location</Text>
                <Text style={pickerStyles.rowCat}>GPS</Text>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              style={pickerStyles.row}
              onPress={() => {
                onSelect(item.id);
                onClose();
                setQ("");
              }}
            >
              <Text style={pickerStyles.rowName}>{item.name}</Text>
              <Text style={pickerStyles.rowCat}>{item.category}</Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

export function CampusNavBlock({
  data,
  token,
}: {
  data: Data;
  token: string;
}) {
  const places = (data.places ?? []) as CampusPlace[];
  const [fromId, setFromId] = useState(data.fromId ?? YOUR_LOCATION_ID);
  const [toId, setToId] = useState<string | null>(data.toId ?? null);
  const [picker, setPicker] = useState<"from" | "to" | null>(null);
  const [route, setRoute] = useState<{
    distance: string;
    duration: string;
    path: Array<{ lat: number; lng: number }>;
    steps: RouteStep[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [userLoc, setUserLoc] = useState<{
    lat: number;
    lng: number;
    accuracy: number | null;
  } | null>(null);

  const fromPlace =
    fromId && fromId !== YOUR_LOCATION_ID
      ? places.find((p) => p.id === fromId) ?? null
      : null;
  const toPlace = toId ? places.find((p) => p.id === toId) ?? null : null;

  const resolveOrigin = useCallback(async () => {
    if (fromPlace) return fromPlace;
    if (fromId === YOUR_LOCATION_ID) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Allow location to route from your position.");
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const loc = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
      setUserLoc(loc);
      return loc;
    }
    return null;
  }, [fromPlace, fromId]);

  const loadRoute = useCallback(async () => {
    if (!toPlace) {
      setError("Pick a destination.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const o = await resolveOrigin();
      if (!o) {
        setError("Pick a starting point.");
        return;
      }
      const res = await fetchDirections(token, o, toPlace);
      const steps = (res.steps ?? [])
        .map(parseOsrmStep)
        .filter(Boolean) as RouteStep[];
      setRoute({
        distance: res.distance,
        duration: res.duration,
        path: res.path ?? [],
        steps,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't get directions");
      setRoute(null);
    } finally {
      setLoading(false);
    }
  }, [toPlace, resolveOrigin, token]);

  async function launchGoogleMaps() {
    if (!toPlace) {
      setError("Pick a destination.");
      return;
    }
    setError(null);
    try {
      let origin = fromPlace ?? userLoc;
      if (!origin && fromId === YOUR_LOCATION_ID) {
        origin = await resolveOrigin();
      }
      await openGoogleMapsWalking(
        { lat: toPlace.lat, lng: toPlace.lng, label: toPlace.name },
        origin ? { lat: origin.lat, lng: origin.lng } : null
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open Google Maps");
    }
  }

  const mapMarkers = useMemo(() => {
    const m: Array<{ lat: number; lng: number; label: string; color?: string }> =
      [];
    if (fromPlace) {
      m.push({ lat: fromPlace.lat, lng: fromPlace.lng, label: fromPlace.name, color: "#3b82f6" });
    }
    if (userLoc && fromId === YOUR_LOCATION_ID) {
      m.push({ lat: userLoc.lat, lng: userLoc.lng, label: "You", color: "#22c55e" });
    }
    if (toPlace) {
      m.push({ lat: toPlace.lat, lng: toPlace.lng, label: toPlace.name, color: "#ff6a00" });
    }
    return m;
  }, [fromPlace, toPlace, userLoc, fromId]);

  const mapHtml = useMemo(
    () =>
      buildMapHtml({
        path: route?.path ?? [],
        markers: mapMarkers,
      }),
    [route?.path, mapMarkers]
  );

  return (
    <View style={styles.card}>
      <View style={styles.badgeRow}>
        <Text style={styles.badge}>Campus map</Text>
      </View>

      <Pressable style={styles.picker} onPress={() => setPicker("from")}>
        <Text style={styles.pickerLabel}>From</Text>
        <Text style={styles.pickerValue} numberOfLines={1}>
          {fromId === YOUR_LOCATION_ID
            ? "📍 Your location"
            : fromPlace?.name ?? "Select…"}
        </Text>
      </Pressable>

      <Pressable style={styles.picker} onPress={() => setPicker("to")}>
        <Text style={styles.pickerLabel}>To</Text>
        <Text style={styles.pickerValue} numberOfLines={1}>
          {toPlace?.name ?? "Select destination…"}
        </Text>
      </Pressable>

      {error && <Text style={styles.error}>{error}</Text>}

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.orange} size="small" />
          <Text style={styles.loadingText}>Finding route…</Text>
        </View>
      )}

      {route && toPlace && (
        <View style={styles.stats}>
          <Text style={styles.stat}>{route.distance}</Text>
          <Text style={styles.statDot}>·</Text>
          <Text style={styles.stat}>{route.duration} walk</Text>
        </View>
      )}

      {showMap && mapMarkers.length > 0 && (
        <View style={styles.mapWrap}>
          <WebView
            source={{ html: mapHtml }}
            style={styles.map}
            scrollEnabled={false}
            originWhitelist={["*"]}
            javaScriptEnabled
            domStorageEnabled
          />
        </View>
      )}

      {route && route.steps.length > 0 && (
        <View style={styles.steps}>
          <Text style={styles.stepsTitle}>Directions</Text>
          {route.steps.slice(0, 6).map((s, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{s.instruction}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          style={[styles.btnSecondary, (!toPlace || loading) && styles.btnDisabled]}
          onPress={() => void loadRoute()}
          disabled={!toPlace || loading}
        >
          <Text style={styles.btnSecondaryText}>
            {route ? "Refresh directions" : "Get directions"}
          </Text>
        </Pressable>
        {mapMarkers.length > 0 && (
          <Pressable
            style={styles.btnSecondary}
            onPress={() => setShowMap((visible) => !visible)}
          >
            <Text style={styles.btnSecondaryText}>
              {showMap ? "Hide map" : "Show map"}
            </Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.btn, !toPlace && styles.btnDisabled]}
          onPress={() => void launchGoogleMaps()}
          disabled={!toPlace}
        >
          <Text style={styles.btnText}>Open in Google Maps</Text>
        </Pressable>
      </View>

      <PlacePicker
        visible={picker === "from"}
        places={places}
        title="From"
        showYourLocation
        onSelect={(id) => {
          setFromId(id);
          setRoute(null);
          setShowMap(false);
        }}
        onClose={() => setPicker(null)}
      />
      <PlacePicker
        visible={picker === "to"}
        places={places}
        title="To"
        onSelect={(id) => {
          setToId(id);
          setRoute(null);
          setShowMap(false);
        }}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: 56 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  title: { fontSize: 18, fontWeight: "600", color: colors.text },
  close: { color: colors.orange, fontSize: 16, fontWeight: "600" },
  search: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  rowName: { fontSize: 15, color: colors.text, fontWeight: "500" },
  rowCat: { fontSize: 12, color: colors.textMuted, marginTop: 2, textTransform: "capitalize" },
});

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  badge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#22c55e",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  liveDot: { flexDirection: "row", alignItems: "center", gap: 6 },
  pulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },
  liveText: { fontSize: 11, color: "#22c55e", fontWeight: "600" },
  picker: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  pickerLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  pickerValue: { fontSize: 15, color: colors.text, fontWeight: "500" },
  error: {
    color: colors.danger,
    fontSize: 12,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  loadingText: { color: colors.textMuted, fontSize: 13 },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: 6,
  },
  stat: { fontSize: 14, fontWeight: "600", color: colors.text },
  statDot: { color: colors.textMuted },
  mapWrap: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.md,
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  map: { flex: 1, backgroundColor: colors.bgElevated },
  navBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.orangeSoft,
    alignItems: "center",
  },
  navDist: { fontSize: 32, fontWeight: "700", color: colors.orange },
  navLabel: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  gps: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  arrived: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    alignItems: "center",
  },
  arrivedTitle: { fontSize: 18, fontWeight: "700", color: colors.success },
  arrivedSub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  steps: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  stepsTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  stepRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
  },
  stepText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  actions: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  btn: {
    backgroundColor: colors.orange,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#0a0a0a", fontWeight: "700", fontSize: 15 },
  btnGhost: {
    paddingVertical: 10,
    alignItems: "center",
  },
  btnGhostText: { color: colors.textMuted, fontSize: 14 },
  btnSecondary: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  btnSecondaryText: { color: colors.text, fontWeight: "600", fontSize: 15 },
});
