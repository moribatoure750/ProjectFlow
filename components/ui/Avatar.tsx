import { cn } from "@/lib/utils";

/**
 * Avatar — circular user representation. Falls back to initials when no
 * `src` is provided (most common case in this app for now, since there is
 * no auth/avatar upload yet).
 */
type AvatarSize = "sm" | "md" | "lg";

const sizes: Record<AvatarSize, string> = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

export interface AvatarProps {
  /** Initials or short label shown when no image is available. */
  initials: string;
  size?: AvatarSize;
  className?: string;
}

export function Avatar({ initials, size = "md", className }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-accent font-medium text-accent-foreground",
        sizes[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
