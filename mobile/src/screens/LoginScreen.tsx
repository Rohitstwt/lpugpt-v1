import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth";
import { API_URL } from "../config";
import { colors, spacing, typography } from "../theme";

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("student@lpu.in");
  const [password, setPassword] = useState("Student123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.hero}>
          <View style={styles.logoMark}>
            <Text style={styles.logoLetter}>L</Text>
          </View>
          <Text style={styles.logo}>LPUGPT</Text>
          <Text style={styles.sub}>Your AI campus assistant</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            placeholder="student@lpu.in"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={onSubmit}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.hint}>
          Demo · student@lpu.in / Student123!
        </Text>
        <Text style={styles.server} numberOfLines={1}>
          Server · {API_URL}
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  hero: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  logoLetter: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.orange,
  },
  logo: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.8,
  },
  sub: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  form: {
    gap: 0,
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
  },
  button: {
    marginTop: spacing.lg,
    backgroundColor: colors.text,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: colors.bg,
    fontWeight: "600",
    fontSize: 16,
  },
  error: {
    color: colors.danger,
    marginTop: spacing.sm,
    fontSize: 13,
  },
  hint: {
    marginTop: spacing.xl,
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
  },
  server: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 10,
    textAlign: "center",
    opacity: 0.7,
  },
});
