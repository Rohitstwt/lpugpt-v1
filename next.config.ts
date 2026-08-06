import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["tesseract.js", "tesseract.js-core", "puppeteer"],
  // Needed only by DEMO_SQLITE_ON_VERCEL: copy the seeded SQLite snapshot into
  // each serverless function bundle so src/lib/db.ts can clone it to /tmp.
  outputFileTracingIncludes: {
    "/*": ["./prisma/dev.db"],
  },
};

export default nextConfig;
