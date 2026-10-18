import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module and must stay outside the server bundle.
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],

  // Umut is an interactive, auth-driven game: almost every route reads the
  // session and is inherently dynamic. Cache Components would force a Suspense
  // boundary around each of those reads for no real benefit here.
  cacheComponents: false,

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
