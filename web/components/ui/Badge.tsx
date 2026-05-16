import React from "react";
import { cn } from "@/lib/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md" | "lg";
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", size = "md", children, ...props }, ref) => {
    const variants = {
      default: "bg-theme-accent2 text-theme-primaryText",
      success: "bg-accent-success text-white",
      warning: "bg-accent-yellow text-theme-primaryText",
      danger: "bg-accent-error text-white",
      info: "bg-accent-green text-white",
    };

    const sizes = {
      sm: "px-2 py-0.5 text-xs",
      md: "px-2.5 py-1 text-sm",
      lg: "px-3 py-1.5 text-base",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full font-medium",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

