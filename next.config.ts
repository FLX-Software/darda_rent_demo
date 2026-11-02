import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
    unoptimized: process.env.STORAGE_TYPE === "local",
  },
  experimental: {
    serverActions: {
      // Produkt-/Übergabebilder: Upload-Limit in Actions ist 10 MB
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
