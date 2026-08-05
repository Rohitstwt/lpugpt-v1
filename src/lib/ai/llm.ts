import OpenAI from "openai";

export type LlmConfig = {
  client: OpenAI;
  model: string;
  provider: string;
};

export function getLlm(): LlmConfig {
  // Groq first — fast cloud chat (set GROQ_API_KEY in .env)
  if (process.env.GROQ_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
      }),
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      provider: "groq",
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      provider: "openai",
    };
  }

  // Local Ollama (offline fallback)
  const baseURL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1";
  return {
    client: new OpenAI({
      apiKey: process.env.OLLAMA_API_KEY || "ollama",
      baseURL,
    }),
    model: process.env.OLLAMA_MODEL || "llama3.2:latest",
    provider: "ollama",
  };
}

/** Prefer a stronger local chat model when available. */
export async function resolveOllamaChatModel(preferred?: string) {
  const fallback = preferred || process.env.OLLAMA_MODEL || "llama3.2:latest";
  try {
    const base = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1").replace(
      /\/v1\/?$/,
      ""
    );
    const res = await fetch(`${base}/api/tags`);
    if (!res.ok) return fallback;
    const data = (await res.json()) as { models?: { name: string }[] };
    const names = new Set((data.models || []).map((m) => m.name));
    const candidates = [
      process.env.OLLAMA_MODEL,
      "llama3.1:8b",
      "llama3.1:latest",
      "llama3.2:latest",
      "llama3.2",
      "mistral:latest",
      "phi3:latest",
    ].filter(Boolean) as string[];
    for (const c of candidates) {
      if (names.has(c)) return c;
      // allow tagless match
      const found = [...names].find((n) => n === c || n.startsWith(`${c}:`) || n.startsWith(c));
      if (found) return found;
    }
  } catch {
    // ignore
  }
  return fallback;
}
