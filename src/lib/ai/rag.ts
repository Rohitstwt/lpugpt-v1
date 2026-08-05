import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

export type KnowledgeDoc = {
  id: string;
  title: string;
  category: string;
  source: string;
  text: string;
};

export type IndexedDoc = KnowledgeDoc & {
  embedding: number[];
  haystack: string;
};

type IndexFile = {
  model: string;
  createdAt: string;
  documents: IndexedDoc[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const KNOWLEDGE_PATH = path.join(DATA_DIR, "campus-knowledge.json");
const INDEX_PATH = path.join(DATA_DIR, "embeddings.json");

let memoryIndex: IndexedDoc[] | null = null;

function cosine(a: number[], b: number[]) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function lexicalScore(query: string, doc: KnowledgeDoc) {
  const q = new Set(tokenize(query));
  const d = tokenize(`${doc.title} ${doc.category} ${doc.text}`);
  if (!q.size || !d.length) return 0;
  let hits = 0;
  for (const t of d) if (q.has(t)) hits += 1;
  const uniqueHits = [...q].filter((t) => d.includes(t)).length;
  return uniqueHits / q.size + hits / (d.length + 1);
}

async function embed(text: string, model: string): Promise<number[]> {
  const base = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1").replace(
    /\/v1\/?$/,
    ""
  );
  const res = await fetch(`${base}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: text }),
  });
  if (!res.ok) {
    throw new Error(`Embedding failed (${res.status})`);
  }
  const data = (await res.json()) as { embedding?: number[] };
  if (!data.embedding?.length) throw new Error("Empty embedding");
  return data.embedding;
}

export function loadKnowledgeDocs(): KnowledgeDoc[] {
  const raw = JSON.parse(readFileSync(KNOWLEDGE_PATH, "utf8")) as {
    documents: KnowledgeDoc[];
  };
  return raw.documents;
}

export function loadIndex(): IndexedDoc[] {
  if (memoryIndex) return memoryIndex;
  if (!existsSync(INDEX_PATH)) return [];
  const raw = JSON.parse(readFileSync(INDEX_PATH, "utf8")) as IndexFile;
  memoryIndex = raw.documents;
  return memoryIndex;
}

export async function buildKnowledgeIndex() {
  const model = process.env.EMBED_MODEL || "nomic-embed-text";
  const docs = loadKnowledgeDocs();
  const indexed: IndexedDoc[] = [];

  for (const doc of docs) {
    const haystack = `${doc.title}\n${doc.category}\n${doc.source}\n${doc.text}`;
    const embedding = await embed(haystack, model);
    indexed.push({ ...doc, embedding, haystack });
    console.log(`Indexed ${doc.id}`);
  }

  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const payload: IndexFile = {
    model,
    createdAt: new Date().toISOString(),
    documents: indexed,
  };
  writeFileSync(INDEX_PATH, JSON.stringify(payload));
  memoryIndex = indexed;
  return indexed.length;
}

export async function retrieveKnowledge(query: string, k = 5) {
  let index = loadIndex();
  if (!index.length) {
    // Lazy build once if index missing
    await buildKnowledgeIndex();
    index = loadIndex();
  }

  const model = process.env.EMBED_MODEL || "nomic-embed-text";
  let queryEmbedding: number[] | null = null;
  try {
    queryEmbedding = await embed(query, model);
  } catch {
    queryEmbedding = null;
  }

  const scored = index.map((doc) => {
    const lex = lexicalScore(query, doc);
    const sem = queryEmbedding ? cosine(queryEmbedding, doc.embedding) : 0;
    return {
      doc,
      score: sem * 0.75 + lex * 0.25,
      sem,
      lex,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).filter((s) => s.score > 0.18);
}

function clip(text: string, max = 160) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

export function formatRetrievedContext(
  hits: { doc: KnowledgeDoc; score: number }[]
) {
  if (!hits.length) return "No matching knowledge-base documents.";
  // Keep context short so the model answers tightly instead of dumping docs.
  return hits
    .slice(0, 3)
    .map(
      (h, i) =>
        `[${i + 1}] ${h.doc.title} (${h.doc.category})\n${clip(h.doc.text, 180)}`
    )
    .join("\n\n");
}
