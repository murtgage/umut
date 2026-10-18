import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Koşullu sınıf birleştirme (çakışan Tailwind sınıflarında son kazanır). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
