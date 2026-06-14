import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// This app lives in a subdirectory of a larger repo (the Daml + Solidity work
// sits alongside). Pin the workspace root so Next doesn't guess from an outer
// lockfile.
const root = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: { root },
};

export default nextConfig;
