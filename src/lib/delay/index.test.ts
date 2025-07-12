import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getRandomNumberInRange, delay } from "./index";

describe("getRandomNumberInRange", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return number in range of given values", () => {
    const min = 3;
    const max = 10;
    const result = getRandomNumberInRange(min, max);

    console.log(result)

    expect(result).toBeGreaterThanOrEqual(min);
    expect(result).toBeLessThanOrEqual(max);
    expect(Number.isInteger(result)).toBe(true);
  });
});

describe("delay", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should resolve after the specified delay time", async () => {
    const minSeconds = 1;
    const maxSeconds = 3;

    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const delayPromise = delay(getRandomNumberInRange(minSeconds, maxSeconds));

    vi.advanceTimersByTime(1000);

    let resolved = false;
    delayPromise.then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);

    vi.advanceTimersByTime(1000);
    await delayPromise;

    expect(resolved).toBe(true);
  });
});
