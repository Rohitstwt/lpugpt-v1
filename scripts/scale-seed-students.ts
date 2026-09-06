/**
 * Bulk-create student accounts for load testing PostgreSQL at scale.
 * Usage: npm run db:scale-seed -- 5000
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();

const BATCH = 500;

async function main() {
  const count = Number(process.argv[2] ?? process.env.SCALE_SEED_COUNT ?? 1000);
  if (!Number.isFinite(count) || count < 1) {
    throw new Error("Provide a positive student count, e.g. npm run db:scale-seed -- 1000");
  }

  const password = process.env.SCALE_SEED_PASSWORD ?? "Student123!";
  const passwordHash = await bcrypt.hash(password, 12);
  const departments = ["CSE", "ECE", "ME", "MBA", "BBA", "CIVIL"];

  const existing = await prisma.user.count({
    where: { email: { startsWith: "scale-" } },
  });

  console.log(`Creating ${count} scale-test students (existing scale-*: ${existing})…`);

  let created = 0;
  for (let offset = 0; offset < count; offset += BATCH) {
    const slice = Math.min(BATCH, count - offset);
    const data = Array.from({ length: slice }, (_, i) => {
      const n = existing + offset + i + 1;
      return {
        id: nanoid(),
        email: `scale-${n}@lpu.in`,
        name: `Scale Student ${n}`,
        passwordHash,
        role: "STUDENT",
        studentId: `12${String(n).padStart(6, "0")}`,
        department: departments[n % departments.length],
      };
    });

    const result = await prisma.user.createMany({ data, skipDuplicates: true });
    created += result.count;
    console.log(`  batch ${offset / BATCH + 1}: +${result.count} (total ${created})`);
  }

  const totalStudents = await prisma.user.count({ where: { role: "STUDENT" } });
  console.log(`Done. ${created} new scale students. Total students in DB: ${totalStudents}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
