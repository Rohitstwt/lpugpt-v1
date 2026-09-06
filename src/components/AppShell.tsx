"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageRenderer } from "@/components/chat/MessageRenderer";
import { SuggestedQuestions } from "@/components/home/SuggestedQuestions";
import type { UIBlock } from "@/types/ui-blocks";
import { normalizeChatBlocks } from "@/lib/chat/normalize-blocks";

type User = {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
};

type ChatItem = {
  id: string;
  role: "user" | "assistant";
  content: string;
  blocks?: UIBlock[];
};

type Attachment = {
  id: string;
  filename: string;
  kind: string;
  mimeType: string;
  preview?: string | null;
};

type LiveUpdate = {
  id: string;
  type: string;
  title: string;
  body: string;
  location?: string | null;
  courseCode?: string | null;
  createdAt: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

function renderMarkdownLite(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-text">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export default function AppShell({ user }: { user: User }) {
  return (
    <Suspense>
      <AppShellInner user={user} />
    </Suspense>
  );
}

import TeacherDashboard from "@/components/teacher/TeacherDashboard";

function AppShellInner({ user }: { user: User }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTeacherConsole, setShowTeacherConsole] = useState(false);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [listening, setListening] = useState(false);
  const [dictating, setDictating] = useState("");
  const [live, setLive] = useState(false);
  const [updates, setUpdates] = useState<LiveUpdate[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseInputRef = useRef("");

  const suggestions = useMemo(() => {
    return [
      "Pay my fees",
      "Submit my assignment before deadline",
      "How do I go from Block 38 to Block 13?",
      "Show my fee dues",
      "Where is Block 34?",
      "CSE faculty directory",
    ];
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && messages.length === 0 && !loading) {
      void sendMessage(q);
      router.replace("/app", { scroll: false });
    }
    // Only run on initial mount with query param
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch("/api/mesh/updates")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data.updates)) return;
        setUpdates(
          data.updates.map(
            (u: {
              id: string;
              type: string;
              title: string;
              body: string;
              location?: string | null;
              createdAt: string;
              course?: { code: string } | null;
            }) => ({
              id: u.id,
              type: u.type,
              title: u.title,
              body: u.body,
              location: u.location,
              createdAt: u.createdAt,
              courseCode: u.course?.code,
            })
          )
        );
      })
      .catch(() => {});

    const es = new EventSource("/api/mesh/stream");
    es.addEventListener("hello", () => setLive(true));
    es.addEventListener("mesh", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as LiveUpdate & {
          courseCode?: string | null;
        };
        setUpdates((prev) => {
          if (prev.some((p) => p.id === data.id)) return prev;
          return [data, ...prev].slice(0, 20);
        });
      } catch {
        // ignore
      }
    });
    es.onerror = () => {
      setLive(false);
      // Stale session after DB reset → force re-login instead of endless 401s
      if (es.readyState === EventSource.CLOSED) {
        // ignore normal close
      }
      fetch("/api/auth/me")
        .then((r) => {
          if (r.status === 401) {
            window.location.href = "/api/auth/clear?next=/login";
          }
        })
        .catch(() => {});
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  async function uploadFile(file: File) {
    setUploading(true);
    const isImage = file.type.startsWith("image/");
    if (isImage) {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Reading “${file.name}”… this can take ~20–40s the first time.`,
        },
      ]);
    }
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.error || "Upload failed.",
          },
        ]);
        return;
      }
      setAttachments((prev) => [
        ...prev,
        {
          id: data.id,
          filename: data.filename,
          kind: data.kind,
          mimeType: data.mimeType,
          preview: data.preview,
        },
      ]);
      if (isImage) {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.hasText
              ? `Got it — “${data.filename}” is attached. Ask me anything about the flyer (dates, prices, contact).`
              : `Attached “${data.filename}”, but I couldn’t read much text from it. Try a clearer photo.`,
          },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Upload failed. Please try again.",
        },
      ]);
    } finally {
      setUploading(false);
    }
  }

  function toggleMic() {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Live dictation needs Chrome/Edge mic access (Wispr-style). Allow microphone permission and try again.",
        },
      ]);
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      setDictating("");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    baseInputRef.current = input;

    recognition.onresult = (event) => {
      let interim = "";
      let finalChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalChunk += transcript;
        else interim += transcript;
      }
      if (finalChunk) {
        const next = `${baseInputRef.current}${baseInputRef.current ? " " : ""}${finalChunk.trim()} `;
        baseInputRef.current = next;
        setInput(next);
        setDictating(interim);
      } else {
        setDictating(interim);
        setInput(
          `${baseInputRef.current}${baseInputRef.current && interim ? " " : ""}${interim}`
        );
      }
    };

    recognition.onerror = () => {
      setListening(false);
      setDictating("");
    };
    recognition.onend = () => {
      setListening(false);
      setDictating("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || loading) return;

    const attachmentIds = attachments.map((a) => a.id);
    const display =
      trimmed ||
      (attachments.length
        ? `Please review my uploaded file${attachments.length > 1 ? "s" : ""}.`
        : "");

    setInput("");
    setDictating("");
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setMessages((m) => [
      ...m,
      {
        id: crypto.randomUUID(),
        role: "user",
        content:
          attachmentIds.length > 0
            ? `${display}\n\n📎 ${attachments.map((a) => a.filename).join(", ")}`
            : display,
      },
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: display, attachmentIds }),
      });
      if (res.status === 401) {
        window.location.href = "/api/auth/clear?next=/app";
        return;
      }
      let data: {
        reply?: string;
        error?: string;
        blocks?: UIBlock[];
      } = {};
      try {
        data = await res.json();
      } catch {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Server error (${res.status}). Try refreshing — the app may need a restart.`,
          },
        ]);
        return;
      }
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.error || "Something went wrong. Please try again.",
          },
        ]);
        return;
      }

      const packed = normalizeChatBlocks(data.reply || "", data.blocks ?? []);

      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: packed.reply,
          blocks: packed.blocks.length
            ? packed.blocks
            : [{ type: "text", content: packed.reply || data.reply || "" }],
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Connection error. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await sendMessage(input);
  }

  function newChat() {
    setMessages([]);
    setInput("");
    setAttachments([]);
    setSidebarOpen(false);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const empty = messages.length === 0 && !loading;

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-text">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-sidebar transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-border p-3">
          <button
            type="button"
            onClick={newChat}
            className="flex flex-1 items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm text-text transition hover:bg-surface"
          >
            <span className="text-orange">+</span>
            New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-4 flex items-center justify-between px-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
              Live campus DB
            </p>
            <span className="text-[10px] text-orange">{live ? "● live" : "○ idle"}</span>
          </div>
          <div className="space-y-2">
            {updates.length === 0 ? (
              <p className="px-2 text-xs text-text-muted">
                No live pulses yet. Teacher updates appear here instantly.
              </p>
            ) : (
              updates.slice(0, 8).map((u) => (
                <article
                  key={u.id}
                  className="rounded-xl border border-border bg-surface/60 px-3 py-2"
                >
                  <p className="text-[10px] uppercase tracking-wide text-orange">
                    {u.type}
                    {u.courseCode ? ` · ${u.courseCode}` : ""}
                  </p>
                  <p className="mt-1 text-xs font-medium text-text">{u.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-text-muted">{u.body}</p>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="border-t border-border p-3">
          <div className="mb-2 rounded-lg px-2 py-2">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-text-muted">
              {user.role.charAt(0) + user.role.slice(1).toLowerCase()} · {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full rounded-lg px-2 py-2 text-left text-sm text-text-muted transition hover:bg-surface hover:text-text"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border px-4 md:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-text-muted hover:bg-surface md:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-display text-lg font-700 text-orange">LPUGPT</span>
          {user.role === "TEACHER" || user.role === "ADMIN" ? (
            <button
              type="button"
              onClick={() => setShowTeacherConsole(true)}
              className="ml-auto flex items-center gap-1.5 rounded-full border border-orange/40 bg-orange-soft px-3 py-1.5 text-xs font-semibold text-orange transition hover:bg-orange hover:text-bg"
            >
              🎓 Teacher Operations Console
            </button>
          ) : null}
          {listening ? (
            <span className="rounded-full bg-orange-soft px-2.5 py-1 text-[11px] text-orange">
              Listening… {dictating ? `"${dictating}"` : ""}
            </span>
          ) : null}
        </header>

        {showTeacherConsole ? (
          <TeacherDashboard onClose={() => setShowTeacherConsole(false)} />
        ) : null}

        <div className="flex-1 overflow-y-auto">
          {empty ? (
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-4 py-12">
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-3xl font-700 tracking-tight text-text sm:text-4xl"
              >
                How may I assist you today?
              </motion.h1>
              <p className="mt-3 text-center text-sm text-text-muted sm:text-base">
                Campus navigation, events, faculty, fees, and academic records — all in one place.
              </p>
              <SuggestedQuestions
                onSelect={(q) => sendMessage(q)}
                className="mt-10 w-full"
              />
            </div>
          ) : (
            <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
              <div className="space-y-6">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 sm:gap-4"
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        msg.role === "assistant"
                          ? "bg-orange text-bg"
                          : "bg-surface text-text-muted"
                      }`}
                    >
                      {msg.role === "assistant" ? "L" : user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="mb-2 text-xs font-medium text-text-muted">
                        {msg.role === "assistant" ? "LPUGPT" : "You"}
                      </p>
                      {msg.role === "assistant" && msg.blocks ? (
                        <MessageRenderer
                          blocks={msg.blocks}
                          onQuickAction={(q) => sendMessage(q)}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap text-[15px] leading-7 text-text">
                          {renderMarkdownLite(msg.content)}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                {loading ? (
                  <div className="flex gap-3 sm:gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange text-xs font-semibold text-bg">
                      L
                    </div>
                    <div className="flex items-center gap-1.5 pt-2">
                      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-text-muted" />
                      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-text-muted" />
                      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-text-muted" />
                    </div>
                  </div>
                ) : null}
                <div ref={bottomRef} />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border bg-bg px-4 py-4 sm:px-6">
          {attachments.length > 0 ? (
            <div className="mx-auto mb-3 flex w-full max-w-3xl flex-wrap gap-2">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text"
                >
                  <span className="text-orange">{a.kind === "image" ? "🖼" : "📄"}</span>
                  <span className="max-w-[160px] truncate">{a.filename}</span>
                  <button
                    type="button"
                    className="text-text-muted hover:text-text"
                    onClick={() =>
                      setAttachments((prev) => prev.filter((x) => x.id !== a.id))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <form
            onSubmit={onSubmit}
            className="mx-auto flex w-full max-w-3xl items-end gap-1 rounded-3xl border border-border bg-surface px-2 py-2 shadow-lg shadow-black/20 focus-within:border-orange/50"
          >
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".txt,.md,.csv,.json,.pdf,.docx,text/plain,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadFile(f);
                e.target.value = "";
              }}
            />
            <input
              ref={galleryRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadFile(f);
                e.target.value = "";
              }}
            />

            <button
              type="button"
              title="Upload file"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-muted transition hover:bg-bg-elevated hover:text-orange disabled:opacity-40"
              aria-label="Upload file"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-8.49 8.49a5.5 5.5 0 01-7.78-7.78l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a1.5 1.5 0 01-2.12-2.12l8.49-8.48" />
              </svg>
            </button>

            <button
              type="button"
              title="Gallery"
              disabled={uploading}
              onClick={() => galleryRef.current?.click()}
              className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-muted transition hover:bg-bg-elevated hover:text-orange disabled:opacity-40"
              aria-label="Open gallery"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </button>

            <button
              type="button"
              title={listening ? "Stop dictation" : "Start voice dictation"}
              onClick={toggleMic}
              className={`mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
                listening
                  ? "bg-orange text-bg"
                  : "text-text-muted hover:bg-bg-elevated hover:text-orange"
              }`}
              aria-label="Microphone"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
              </svg>
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                baseInputRef.current = e.target.value;
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              rows={1}
              placeholder={
                listening ? "Speak naturally — text appears here…" : "Message LPUGPT…"
              }
              className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] outline-none placeholder:text-text-muted"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage(input);
                }
              }}
            />

            <button
              type="submit"
              disabled={loading || uploading || (!input.trim() && attachments.length === 0)}
              className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange text-bg transition hover:bg-orange-dim disabled:opacity-40"
              aria-label="Send"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-text-muted">
            Mic = live voice→text · Gallery = images · Paperclip = files for Q&A
          </p>
        </div>
      </div>
    </div>
  );
}
