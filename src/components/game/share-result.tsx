"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

/** Paylaşımda kullanılacak kalıcı adres. */
const SHARE_URL = "https://umut.vercel.app";

/**
 * Tur sonucunu paylaşır.
 * Önce cihazın yerel paylaşım menüsünü (Web Share API) dener; desteklenmiyorsa
 * (masaüstü tarayıcıların çoğu) metni panoya kopyalar.
 */
export function ShareResultButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Umut — KPSS Bilgi Yarışması",
          text,
          url: SHARE_URL,
        });
        return;
      } catch {
        // Kullanıcı paylaşımı iptal etti ya da tarayıcı reddetti → panoya kopyala.
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${SHARE_URL}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button variant="secondary" size="lg" onClick={handleShare}>
      {copied ? "Bağlantı kopyalandı ✓" : "Sonucu paylaş"}
    </Button>
  );
}
