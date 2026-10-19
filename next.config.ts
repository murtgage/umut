import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `pg` must stay outside the server bundle so the PostgreSQL driver is loaded
  // at runtime instead of being traced into the build.
  serverExternalPackages: ["pg"],

  // Paylaşım tünelleri (cloudflared/ngrok) üzerinden gelen istekler Next.js
  // dev sunucusu tarafından "blocked cross-origin" hatasıyla engelleniyordu;
  // bu yüzden telefonda JS/hydration yüklenmiyor ve butonlar çalışmıyordu.
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app", "localhost:3001"],

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
