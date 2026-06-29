import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Fly Docker image.
  output: "standalone",
};

export default nextConfig;
