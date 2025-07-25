import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names conditionally and merges Tailwind styles correctly.
 * Use this instead of string templates for `className`.
 *
 * Example:
 *   cn("bg-white", isDark && "bg-black", "text-sm")
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(...inputs));
}

