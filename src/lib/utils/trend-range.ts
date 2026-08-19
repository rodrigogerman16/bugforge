export const TREND_RANGE_DAYS = [7, 30, 90] as const;
export type TrendRangeDays = (typeof TREND_RANGE_DAYS)[number];

export function isTrendRangeDays(value: number): value is TrendRangeDays {
  return (TREND_RANGE_DAYS as readonly number[]).includes(value);
}
