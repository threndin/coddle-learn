import type { NextConfig } from "next";

const apiUrl = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  transpilePackages: ["@coddle/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.coddle.dev",
        pathname: "/coddle-learn/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/profile",
        destination: "/settings?tab=profile",
        permanent: true,
      },
      {
        source: "/profile/:path*",
        destination: "/settings?tab=profile",
        permanent: true,
      },
    ];
  },
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
