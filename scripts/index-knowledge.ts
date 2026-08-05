import { buildKnowledgeIndex } from "../src/lib/ai/rag";

async function main() {
  const n = await buildKnowledgeIndex();
  console.log(`Built knowledge index with ${n} documents.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
