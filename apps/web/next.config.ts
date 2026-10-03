import type { NextConfig } from "next";

const apiUrl = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  transpilePackages: ["@coddle/shared"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
  devIndicators: false,
};

export default nextConfig;
