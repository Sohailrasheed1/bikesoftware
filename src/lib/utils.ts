import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPKR(amount: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount).replace("PKR", "Rs.");
}

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return "-";
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [y, m, d] = dateString.split("-").map(Number);
      const localDate = new Date(y, m - 1, d);
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(localDate);
    }
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return dateString;
  }
}

export function daysSince(dateString: string): number {
  if (!dateString) return 0;
  const d = new Date(dateString).getTime();
  const now = new Date().getTime();
  const diffTime = Math.max(0, now - d);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function formatCompatibleModels(models: string[] | string | undefined | null): string {
  if (!models) return "";
  if (Array.isArray(models)) return models.join(", ");
  return String(models);
}

export function toModelArray(models: string[] | string | undefined | null): string[] {
  if (!models) return [];
  if (Array.isArray(models)) return models;
  if (typeof models === "string") {
    return models
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
  }
  return [];
}
