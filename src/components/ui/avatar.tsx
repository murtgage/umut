import { initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface AvatarProps {
  name: string;
  image?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
};

export function Avatar({ name, image, size = "md", className }: AvatarProps) {
  const base = cn(
    "grid shrink-0 place-items-center overflow-hidden rounded-full border border-line-strong bg-elevated font-semibold text-brand-soft",
    SIZE_CLASSES[size],
    className,
  );

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatarlar dış kaynaklı ve optimize edilmeye ihtiyaç duymuyor
      <img src={image} alt={name} className={cn(base, "object-cover")} />
    );
  }

  return (
    <span className={base} aria-hidden>
      {initialsOf(name)}
    </span>
  );
}
