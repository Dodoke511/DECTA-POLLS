import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Use this app folder as Turbopack root so Next does not pick a parent lockfile
  // (e.g. C:\Users\...\package-lock.json) and mis-resolve the workspace.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
