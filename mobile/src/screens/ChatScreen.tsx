import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAuth } from "../auth";
import { sendChatMessage } from "../api";
import { normalizeAssistantMessage } from "../lib/normalizeChat";
import { ChatInput } from "../components/ChatInput";
import { useKeyboardHeight } from "../hooks/useKeyboardHeight";
import { MessageBubble, type Message } from "../components/MessageBubble";
import { TypingIndicator } from "../components/TypingIndicator";
import { WelcomeView } from "../components/WelcomeView";
import { colors, spacing } from "../theme";

function suggestionsForRole(role: string) {
  if (role === "TEACHER") {
    return [
      "Post announcement for CSE301",
      "Update CSE310 class location",
      "Show my courses",
      "Upcoming campus events",
    ];
  }
  return [
    "Pay my fees",
    "Submit my assignment",
    "Apply for sick leave tomorrow",
    "Show campus map",
    "How do I go from Block 38 to Block 13?",
  ];
}

export function ChatScreen() {
  const { user, token, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const loadingRef = useRef(false);

  const keyboardOpen = keyboardHeight > 0;
  const inputBottomPad = Math.max(insets.bottom, spacing.sm);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !token || loadingRef.current) return;

      loadingRef.current = true;
      setInput("");
      setLoading(true);

      const userMsg: Message = {
        id: `${Date.now()}-u`,
        role: "user",
        text: trimmed,
      };
      setMessages((m) => [...m, userMsg]);
      scrollToEnd();

      try {
        const res = await sendChatMessage(token, trimmed);
        const { text, blocks } = normalizeAssistantMessage(
          res.reply || res.error || "",
          res.blocks
        );
        const assistantMsg: Message = {
          id: `${Date.now()}-a`,
          role: "assistant",
          text: text || res.error || "No response",
          blocks,
        };
        setMessages((m) => [...m, assistantMsg]);
      } catch (e) {
        setMessages((m) => [
          ...m,
          {
            id: `${Date.now()}-err`,
            role: "assistant",
            text:
              e instanceof Error
                ? e.message
                : "Couldn't reach the server. Check Wi‑Fi and that the backend is running.",
          },
        ]);
      } finally {
        loadingRef.current = false;
        setLoading(false);
        scrollToEnd();
      }
    },
    [token, scrollToEnd]
  );

  const suggestions = suggestionsForRole(user?.role ?? "STUDENT");
  const showWelcome = messages.length === 0 && !loading;

  const renderItem = useCallback(
    ({ item }: { item: Message }) =>
      token ? <MessageBubble item={item} token={token} /> : null,
    [token]
  );

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.menuBtn} onPress={() => signOut()}>
          <Text style={styles.menuIcon}>☰</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>LPUGPT</Text>
          <Text style={styles.headerSub}>{user?.role?.toLowerCase()}</Text>
        </View>
        <View style={styles.menuBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.flex}>
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              style={styles.flex}
              contentContainerStyle={[
                styles.list,
                showWelcome && styles.listEmpty,
                { paddingBottom: spacing.md },
              ]}
              ListEmptyComponent={
                showWelcome ? (
                  <WelcomeView
                    name={user?.name ?? "there"}
                    suggestions={suggestions}
                    onSuggestion={send}
                  />
                ) : null
              }
              ListFooterComponent={loading ? <TypingIndicator /> : null}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
              automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
              removeClippedSubviews={Platform.OS === "android"}
              maxToRenderPerBatch={8}
              windowSize={12}
              initialNumToRender={10}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableWithoutFeedback>

        <View style={[styles.inputDock, { paddingBottom: inputBottomPad }]}>
          <ChatInput
            value={input}
            onChangeText={setInput}
            onSend={() => send(input)}
            onFocus={() => {
              setTimeout(scrollToEnd, 120);
            }}
            loading={loading}
            disabled={!token}
            compact={keyboardOpen}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  menuBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIcon: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
    textTransform: "capitalize",
  },
  list: {
    flexGrow: 1,
  },
  listEmpty: {
    flexGrow: 1,
  },
  inputDock: {
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
});
