import { randomInt } from "node:crypto";

/** Fisher-Yates karıştırma (kriptografik rastgele). Diziyi yerinde değiştirir. */
export function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/** Tohumlu PRNG — günlük tur gibi "herkes için aynı" seçimlerde kullanılır. */
export function mulberry32(seed: number) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tohumlu karıştırma: aynı tohum + aynı girdi => aynı sıra. */
export function shuffleSeeded<T>(items: T[], seed: number): T[] {
  const random = mulberry32(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Günlük tur için YYYYMMDD biçiminde tohum. */
export function daySeed(date: Date = new Date()): number {
  return date.getFullYear() * 10_000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/** Yerel günün başlangıcı (günlük tur kontrolü için). */
export function startOfToday(date: Date = new Date()): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}
