import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Native llama.cpp bindings must not be bundled
  serverExternalPackages: ["node-llama-cpp"],
  experimental: {
    serverActions: { bodySizeLimit: "10mb" }, // allows importing larger backups
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          // Cross-origin isolation lets on-device AI use all CPU cores (SharedArrayBuffer)
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
