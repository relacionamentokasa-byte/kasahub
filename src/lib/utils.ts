import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return input;
  return input.replace(/[<>]/g, ''); // Remove < e > para evitar tags HTML
}

