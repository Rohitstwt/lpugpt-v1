import { PrismaClient } from "@prisma/client";
import { extractFileText } from "../src/lib/files";

const prisma = new PrismaClient();

async function main() {
  const files = await prisma.uploadedFile.findMany({
    where: { kind: "image" },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  console.log("images", files.length);
  for (const f of files) {
    console.log("analyzing", f.filename, f.storagePath);
    const text = await extractFileText(f.storagePath, f.mimeType, f.filename);
    console.log("preview:", text?.slice(0, 300));
    if (text) {
      await prisma.uploadedFile.update({
        where: { id: f.id },
        data: { extractedText: text },
      });
      console.log("updated", f.id);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
