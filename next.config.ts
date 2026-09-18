import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["firebase-admin"],

  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination:
          "https://reigna-ff5c5.firebaseapp.com/__/auth/:path*",
      },
    ];
  },
};

export default nextConfig;
