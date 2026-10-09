import { describe, expect, it } from "vitest";
import { lineTotals } from "../utils/money.js";

describe("lineTotals", () => {
  it("calculates exact minor-unit totals", () => {
    expect(lineTotals(42000, 2, 1800)).toEqual({
      subtotalMinor: 84000,
      taxMinor: 15120,
      discountMinor: 0,
      totalMinor: 99120
    });
  });
});
