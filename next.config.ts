import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
    unoptimized: process.env.STORAGE_TYPE === "local",
  },
};

export default nextConfig;
