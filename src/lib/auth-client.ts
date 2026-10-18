"use client";

import { createAuthClient } from "better-auth/react";
import {
  anonymousClient,
  emailOTPClient,
  usernameClient,
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [usernameClient(), emailOTPClient(), anonymousClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;

/** E-posta doğrulama kodu (OTP) işlemleri. */
export const emailOtp = authClient.emailOtp;
