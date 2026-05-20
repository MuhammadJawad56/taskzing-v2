import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ProfileVerifiedBadgeProps = {
  /** Blue provider tick (Flutter `Icons.verified`). */
  variant: "provider" | "account";
  /** Mobile vs desktop sizing — matches Flutter profile header. */
  size?: "mobile" | "desktop";
  className?: string;
};

/**
 * Profile verification icon — Flutter parity (`myProfile_widget` / `profile_widget`).
 * Provider: blue badge next to display name. Account: green badge when verified.
 */
export function ProfileVerifiedBadge({
  variant,
  size = "mobile",
  className,
}: ProfileVerifiedBadgeProps) {
  const isProvider = variant === "provider";
  return (
    <BadgeCheck
      className={cn(
        "shrink-0",
        isProvider ? "text-blue-500" : "text-green-500",
        size === "mobile" ? "h-3 w-3 sm:h-3.5 sm:w-3.5" : "h-5 w-5",
        className,
      )}
      aria-label={isProvider ? "Provider" : "Verified"}
    />
  );
}
