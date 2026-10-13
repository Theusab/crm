import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  experimental: {
    serverActions: {
      bodySizeLimit: "9mb",
    },
  },
};

export default nextConfig;
