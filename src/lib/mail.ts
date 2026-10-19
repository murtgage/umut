import "server-only";

import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import nodemailer, { type Transporter } from "nodemailer";

/**
 * E-posta gönderimi.
 *
 * `SMTP_HOST` tanımlıysa gerçek SMTP ile gönderir; tanımlı değilse ve
 * üretim ortamında değilsek iletileri `prisma/.dev-outbox.jsonl` dosyasına
 * yazar ve konsola basar. Böylece SMTP olmadan da doğrulama kodu akışı
 * uçtan uca denenebilir.
 */

const SMTP_HOST = process.env.SMTP_HOST?.trim();
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_USER = process.env.SMTP_USER?.trim();
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = process.env.SMTP_SECURE === "true" || SMTP_PORT === 465;
const MAIL_FROM = process.env.MAIL_FROM?.trim() || "Umut <no-reply@umut.local>";

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const DEV_OUTBOX_PATH = path.join(process.cwd(), "prisma", ".dev-outbox.jsonl");

export const isMailTransportConfigured = Boolean(SMTP_HOST);

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export async function sendMail(message: MailMessage): Promise<void> {
  if (isMailTransportConfigured) {
    await getTransporter().sendMail({
      from: MAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return;
  }

  // Demo/paylaşım modu: SMTP yapılandırılmamışsa (üretimde bile) iletiyi
  // geliştirme kutusuna yazıyoruz. Aksi hâlde kayıt sonrası doğrulama kodu
  // kullanıcıya hiçbir şekilde ulaşmaz ve akış kilitlenir.
  if (IS_PRODUCTION && !isMailTransportConfigured) {
    console.warn(
      "[umut/mail] Üretimde SMTP_HOST tanımlı değil — doğrulama kodu geliştirme kutusuna yazılıyor (demo modu).",
    );
  }

  await writeDevOutbox(message);
  console.info(
    `\n[umut/mail] SMTP yapılandırılmadı — ileti geliştirme kutusuna yazıldı.\n` +
      `  Kime   : ${message.to}\n` +
      `  Konu   : ${message.subject}\n` +
      `  İçerik : ${message.text}\n  Dosya  : prisma/.dev-outbox.jsonl\n`,
  );
}

async function writeDevOutbox(message: MailMessage): Promise<void> {
  const entry: DevOutboxEntry = {
    at: new Date().toISOString(),
    to: message.to,
    subject: message.subject,
    text: message.text,
  };

  try {
    await mkdir(path.dirname(DEV_OUTBOX_PATH), { recursive: true });
    await appendFile(DEV_OUTBOX_PATH, `${JSON.stringify(entry)}\n`, "utf8");
  } catch (error) {
    console.warn("[umut/mail] Geliştirme kutusuna yazılamadı:", error);
  }
}

export interface DevOutboxEntry {
  at: string;
  to: string;
  subject: string;
  text: string;
}

/** Geliştirme kutusundaki son iletileri (en yeni önce) döndürür. */
export async function readDevOutbox(
  email: string,
  limit = 3,
): Promise<DevOutboxEntry[]> {
  // Gerçek SMTP varsa kutu kullanılmaz. SMTP yoksa (demo modu) kodu ekranda
  // gösterebilmek için üretimde de okuruz.
  if (isMailTransportConfigured) return [];

  try {
    const raw = await readFile(DEV_OUTBOX_PATH, "utf8");
    return raw
      .split("\n")
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as DevOutboxEntry];
        } catch {
          return [];
        }
      })
      .filter((entry) => entry.to.toLowerCase() === email.toLowerCase())
      .slice(-limit)
      .reverse();
  } catch {
    return [];
  }
}

/** İleti metninden 6 haneli doğrulama kodunu çıkarır (geliştirme kolaylığı). */
export function extractOtp(text: string): string | null {
  const match = text.match(/(?:^|\D)(\d{6})(?:\D|$)/);
  return match ? match[1] : null;
}
