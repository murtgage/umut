const numberFormatter = new Intl.NumberFormat("tr-TR");

/** 12345 -> "12.345" */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/**
 * 0–100 aralığındaki bir yüzde değerini gösterime çevirir (girdi zaten yüzdedir).
 *   73   -> "%73"
 *   85.5 -> "%86"
 * Aritmetik oran (0–1) verirsen `ratio * 100` yapmalısın.
 */
export function formatPercent(percent: number): string {
  const safe = Number.isFinite(percent)
    ? Math.min(Math.max(percent, 0), 100)
    : 0;
  return `%${Math.round(safe)}`;
}

/** 92500 -> "1:32" ; 4500 -> "4,5 sn" */
export function formatDuration(ms: number): string {
  if (ms < 60_000) {
    const seconds = ms / 1000;
    return `${seconds.toFixed(seconds < 10 ? 1 : 0).replace(".", ",")} sn`;
  }

  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Göreli zaman: "az önce", "3 saat önce", "12 Eki 2026" */
export function formatRelativeTime(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - value.getTime();
  const diffMinutes = Math.round(diffMs / 60_000);

  if (diffMinutes < 1) return "az önce";
  if (diffMinutes < 60) return `${diffMinutes} dakika önce`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} saat önce`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays} gün önce`;

  return value.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Türkçe büyük harf (I/İ sorununu doğru çözer). */
export function upperTr(value: string): string {
  return value.toLocaleUpperCase("tr-TR");
}

/** Kullanıcı adının baş harfleri (avatar yer tutucusu için). */
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toLocaleUpperCase("tr-TR");
}

/** Sıralama madalyası: 1 -> altın, 2 -> gümüş, 3 -> bronz. */
export function rankTone(rank: number): "gold" | "silver" | "bronze" | "plain" {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";
  return "plain";
}
