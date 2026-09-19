import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateProdePoints(pred_home: number, pred_away: number, real_home: number, real_away: number) {
  if (real_home === null || real_away === null) return 0;
  if (pred_home === real_home && pred_away === real_away) return 6;
  const pred_diff = pred_home - pred_away;
  const real_diff = real_home - real_away;
  if ((pred_diff > 0 && real_diff > 0) || (pred_diff < 0 && real_diff < 0) || (pred_diff === 0 && real_diff === 0)) return 3;
  return 0;
}