// Nice value axis for a chart (task 035). Zero is always inside the range, and
// the tick step is 1, 2 or 5 times a power of ten, so the ticks read easily.
// Pure: the same values always give the same ticks (PRD §11.1).

export interface Scale {
  /** The lowest tick, the bottom of the plot. */
  lo: number;
  /** The highest tick, the top of the plot. */
  hi: number;
  ticks: number[];
}

const STEPS = [1, 2, 5, 10];

/** The axis for `values`: about four intervals between zero and the largest value. */
export function niceScale(values: readonly number[]): Scale {
  const low = Math.min(0, ...values);
  let high = Math.max(0, ...values);
  if (high === low) high = low + 1;
  const raw = (high - low) / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = STEPS.map((multiple) => multiple * power).find(
    (candidate) => candidate >= raw,
  );
  const unit = step ?? power * 10;
  const first = Math.floor(low / unit);
  const last = Math.ceil(high / unit);
  const ticks: number[] = [];
  for (let k = first; k <= last; k++) {
    ticks.push(Number((k * unit).toPrecision(12)));
  }
  return { lo: ticks[0] ?? 0, hi: ticks[ticks.length - 1] ?? 1, ticks };
}
