import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// all this file does is merge the classes together, it just allows us to work with tailwind and dynamic classes together
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
