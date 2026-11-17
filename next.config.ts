import type { NextConfig } from "next";

const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
// Serve Firebase's sign-in helper from our own domain so the popup/redirect works where browsers
// block third-party storage. Emulator ("demo-") projects have no hosted helper.
const proxyAuthHelper = !!firebaseProjectId && !firebaseProjectId.startsWith("demo-");

const nextConfig: NextConfig = {
  async rewrites() {
    if (!proxyAuthHelper) return [];
    return [
      {
        source: "/__/auth/:path*",
        destination: `https://${firebaseProjectId}.firebaseapp.com/__/auth/:path*`,
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
