import {
  BookOpen,
  Brain,
  Calculator,
  ClipboardCheck,
  ClipboardList,
  Compass,
  Globe,
  GraduationCap,
  Landmark,
  Lightbulb,
  Monitor,
  Newspaper,
  Puzzle,
  Scale,
  Shapes,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Kategori ikonları.
 *
 * Veritabanındaki `icon` alanı Lucide isimlerini (kebab-case) tutar ve
 * `prisma/seed-categories.ts` içindeki değerlerle birebir eşleşir.
 * Tanınmayan/boş değerlerde nötr bir ikona düşer.
 */
const ICONS: Record<string, LucideIcon> = {
  // Genel Yetenek
  "book-open": BookOpen,
  calculator: Calculator,
  shapes: Shapes,
  // Genel Kültür
  landmark: Landmark,
  globe: Globe,
  scale: Scale,
  newspaper: Newspaper,
  // Eğitim Bilimleri
  brain: Brain,
  lightbulb: Lightbulb,
  "clipboard-list": ClipboardList,
  "clipboard-check": ClipboardCheck,
  compass: Compass,
  "graduation-cap": GraduationCap,
  users: Users,
  monitor: Monitor,
  puzzle: Puzzle,
};

export function CategoryIcon({
  name,
  color,
  size = 18,
  className,
}: {
  name: string | null;
  color?: string;
  size?: number;
  className?: string;
}) {
  const Icon = (name ? ICONS[name] : undefined) ?? BookOpen;

  return (
    <Icon
      size={size}
      className={className}
      style={color ? { color } : undefined}
      aria-hidden
    />
  );
}
