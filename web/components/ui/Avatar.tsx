import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, name, size = "md", ...props }, ref) => {
    const sizes = {
      sm: "h-8 w-8 text-xs",
      md: "h-10 w-10 text-sm",
      lg: "h-12 w-12 text-base",
      xl: "h-16 w-16 text-lg",
    };

    const getInitials = (name: string) => {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex items-center justify-center rounded-full bg-secondary-200 text-secondary-700 font-medium overflow-hidden",
          sizes[size],
          className
        )}
        {...props}
      >
        {src ? (
          <Image
            src={src}
            alt={alt || name || "Avatar"}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <span>{name ? getInitials(name) : "?"}</span>
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";

