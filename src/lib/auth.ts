import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { anonymous, emailOTP, username } from "better-auth/plugins";

import { transferGuestProgress } from "./guest";
import { sendMail } from "./mail";
import { prisma } from "./prisma";

/**
 * Aynı-site dışı istemciler için ek güvenilir kaynaklar.
 * `BETTER_AUTH_TRUSTED_ORIGINS="https://alanadi.com,https://www.alanadi.com"`
 */
const extraTrustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Paylaşım tünelleri (cloudflared/ngrok) rastgele alt alan adı üretir; her
// tünel açılışında .env düzenlemek yerine joker kökenlere güveniyoruz.
// better-auth `matchesOriginPattern` şemalı jokerleri destekliyor.
const tunnelTrustedOrigins = [
  "https://*.trycloudflare.com",
  "https://*.ngrok-free.app",
  "https://*.ngrok.io",
  // Vercel dağıtımları: alan adı önizleme (preview) ve üretim için değişir.
  "https://*.vercel.app",
];

/** Doğrulama kodunun geçerlilik süresi (saniye). */
const OTP_TTL_SECONDS = 10 * 60;

/**
 * Konu başlıkları. `Record<string, string>` olmasının nedeni: better-auth
 * `type` parametresi ileride yeni değerler kazanabilir (ör. "change-email");
 * bilinmeyen türlerde aşağıdaki yedek konu kullanılır.
 */
const OTP_SUBJECTS: Record<string, string> = {
  "sign-in": "Umut giriş kodun",
  "email-verification": "Umut e-posta doğrulama kodun",
  "forget-password": "Umut şifre sıfırlama kodun",
  "change-email": "Umut e-posta değiştirme kodun",
};

export const auth = betterAuth({
  appName: "Umut",
  // Vercel'de alan adı ancak dağıtımdan sonra bilinir; `VERCEL_URL` ortam
  // değişkeni (ör. "umut-abc.vercel.app") varsa ondan türetiyoruz. Böylece
  // BETTER_AUTH_URL girilmese de köken kontrolü doğru çalışır.
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3001"),
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [...extraTrustedOrigins, ...tunnelTrustedOrigins],
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    maxPasswordLength: 128,
  },
  emailVerification: {
    expiresIn: OTP_TTL_SECONDS,
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

    /**
     * E-posta doğrulama: bağlantı yerine 6 haneli kod (OTP).
     *
     * DİKKAT: `emailAndPassword.requireEmailVerification` bilinçli olarak KAPALI.
     * Açık olsaydı kayıt sonrası oturum oluşmaz ve OTP ile girişte kullanıcının
     * şifresi silinirdi. Doğrulama kapısını uygulama katmanında uygularız:
     * `requireVerifiedUser()` (bkz. src/lib/session.ts).
     */
    emailOTP({
      overrideDefaultEmailVerification: true,
      otpLength: 6,
      expiresIn: OTP_TTL_SECONDS,
      allowedAttempts: 5,
      async sendVerificationOTP({ email, otp, type }) {
        await sendMail({
          to: email,
          subject: OTP_SUBJECTS[type] ?? "Umut doğrulama kodun",
          text: [
            `Doğrulama kodun: ${otp}`,
            "",
            `Bu kod ${OTP_TTL_SECONDS / 60} dakika geçerlidir.`,
            "Kodu kimseyle paylaşma. Kodu sen istemediysen bu e-postayı yok say.",
          ].join("\n"),
        });
      },
    }),

    /**
     * Üye olmadan oynama: anonim oturum.
     * Misafir daha sonra kayıt olursa better-auth anonim kaydı yeni hesaba
     * bağlar ve ARDINDAN SİLER; ilişkili kayıtlar `onDelete: Cascade` ile
     * gideceği için ilerleme burada, silmeden önce taşınır.
     */
    anonymous({
      async onLinkAccount({ anonymousUser, newUser }) {
        await transferGuestProgress(anonymousUser.user.id, newUser.user.id);
      },
    }),
  ],
});
