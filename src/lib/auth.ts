import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins";

import { prisma } from "./prisma";

/**
 * Aynı-site dışı istemciler için ek güvenilir kaynaklar.
 * `BETTER_AUTH_TRUSTED_ORIGINS="https://alanadi.com,https://www.alanadi.com"`
 */
const extraTrustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const auth = betterAuth({
  appName: "Umut",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: extraTrustedOrigins,
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    maxPasswordLength: 128,
  },
  user: {
    additionalFields: {
      // Server-owned: a player can never promote themselves via sign-up payload.
      role: {
        type: "string",
        required: false,
        defaultValue: "PLAYER",
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 gün
    updateAge: 60 * 60 * 24, // günde bir yenile
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 24,
    }),
  ],
});
