// Number text for number props (task 031, ADR-0015). Pure and locale-fixed:
// `,` groups the thousands, `.` is the decimal mark, and no locale or Intl call
// is made, so every machine draws the same text. Exported for task 032
// (`count-up`), which formats each frame's value with it.

/** The most decimals a number prop may ask for (statistic.json, `decimals`). */
export const MAX_DECIMALS = 6;

/**
 * `value` with exactly `decimals` digits after the decimal mark, grouped in
 * threes before it. Rounding is ECMAScript's toFixed (half away from zero on
 * the value as a binary number). A value that rounds to zero has no sign:
 * -0.001 with 2 decimals is "0.00". `value` must be finite and below 1e21, and
 * `decimals` an integer from 0 to 100 (toFixed's range); the contract keeps
 * both tighter.
 */
export function formatNumber(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals);
  const negative = fixed.startsWith("-") && /[1-9]/.test(fixed);
  const unsigned = fixed.replace(/^-/, "");
  const [whole = "0", fraction] = unsigned.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const tail = fraction === undefined ? "" : `.${fraction}`;
  return `${negative ? "-" : ""}${grouped}${tail}`;
}
