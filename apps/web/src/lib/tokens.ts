/**
 * Design System Token Manager
 *
 * Single source of truth for transition classes, focus patterns, and formatting.
 * Import from here instead of hardcoding values in components.
 */

// ---------------------------------------------------------------------------
// Transition tokens — use instead of `transition-all`
// ---------------------------------------------------------------------------

export const TRANSITIONS = {
  /** Color, background, border changes (buttons, links, badges) */
  colors: "transition-colors duration-200",
  /** Color + box-shadow (inputs on focus) */
  input: "transition-[color,background-color,border-color,box-shadow] duration-200",
  /** Color + box-shadow + transform (cards, primary buttons) */
  interactive:
    "transition-[color,background-color,border-color,box-shadow,transform] duration-200",
  /** Opacity only (fade in/out) */
  opacity: "transition-opacity duration-200",
  /** Transform + box-shadow (hover lifts, scale) */
  transform: "transition-[transform,box-shadow] duration-200",
  /** Width changes (progress bars, expanding panels) */
  width: "transition-[width] duration-300",
  /** Translate (toggle thumb, slide) */
  translate: "transition-transform duration-200",
} as const;

// ---------------------------------------------------------------------------
// Focus tokens — accessible focus ring
// ---------------------------------------------------------------------------

export const FOCUS = {
  /** Standard visible focus ring for interactive elements */
  ring: "focus-visible:outline-2 focus-visible:outline-brand-green focus-visible:outline-offset-2",
  /** For inputs that have their own ring via box-shadow */
  inputRing:
    "focus-visible:outline-transparent focus-visible:ring-2 focus-visible:ring-brand-green/50 focus-visible:border-brand-green/30",
} as const;

// ---------------------------------------------------------------------------
// Z-index scale — fixed scale, no arbitrary z-* values
// ---------------------------------------------------------------------------

export const Z_INDEX = {
  dropdown: "z-50",
  tooltip: "z-50",
  modal: "z-50",
  toast: "z-[100]",
  skipNav: "z-[200]",
} as const;

// ---------------------------------------------------------------------------
// Number + currency formatting — locale-aware, no hardcoding
// ---------------------------------------------------------------------------

export function formatCurrency(
  amount: number,
  currency = "GBP",
  options?: { minimumFractionDigits?: number },
): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
  }).format(amount);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined).format(value);
}

// ---------------------------------------------------------------------------
// Date + time formatting — locale-aware, no hardcoding
// ---------------------------------------------------------------------------

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}
