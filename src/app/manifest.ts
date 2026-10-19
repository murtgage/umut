import type { MetadataRoute } from "next";

/**
 * PWA bildirimi — telefonda "Ana ekrana ekle" ile uygulama gibi açılır.
 * Next.js bu dosyayı otomatik olarak `/manifest.webmanifest` yolunda yayınlar
 * ve `<link rel="manifest">` etiketini sayfalara ekler.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Umut — KPSS Bilgi Yarışması",
    short_name: "Umut",
    description:
      "KPSS'ye hazırlanırken bilgini yarıştır: güncel format sorular, puan sistemi, seri bonusları ve genel sıralama.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "tr",
    dir: "ltr",
    background_color: "#f8fafc",
    theme_color: "#6366f1",
    categories: ["education", "games"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
  };
}
