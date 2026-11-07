import { describe, it, expect } from "vitest";
import { formatSeconds, parseSecondsInput } from "../animation/settingsInput";
import { defaultAnimationSettings, durationLimits } from "../animation/settings";

describe("formatSeconds", () => {
  it("shows the defaults without trailing zeros", () => {
    expect(formatSeconds(defaultAnimationSettings.functionalMs)).toBe("0.54");
    expect(formatSeconds(defaultAnimationSettings.cinematicMs)).toBe("3");
    expect(formatSeconds(2500)).toBe("2.5");
  });

  it("round-trips through parse for every default", () => {
    expect(parseSecondsInput(formatSeconds(540), "functionalMs")).toBe(540);
    expect(parseSecondsInput(formatSeconds(3000), "cinematicMs")).toBe(3000);
  });
});

describe("parseSecondsInput", () => {
  it("converts seconds to whole milliseconds", () => {
    expect(parseSecondsInput("0.54", "functionalMs")).toBe(540);
    expect(parseSecondsInput(" 1.2345 ", "functionalMs")).toBe(1235);
    expect(parseSecondsInput("4", "cinematicMs")).toBe(4000);
  });

  it("clamps to each duration's own limits", () => {
    expect(parseSecondsInput("0", "functionalMs")).toBe(durationLimits.functionalMs.min);
    expect(parseSecondsInput("5", "functionalMs")).toBe(durationLimits.functionalMs.max);
    expect(parseSecondsInput("0.2", "cinematicMs")).toBe(durationLimits.cinematicMs.min);
    expect(parseSecondsInput("60", "cinematicMs")).toBe(durationLimits.cinematicMs.max);
    expect(parseSecondsInput("-3", "cinematicMs")).toBe(durationLimits.cinematicMs.min);
  });

  it("rejects text that is not a number", () => {
    expect(parseSecondsInput("", "functionalMs")).toBeNull();
    expect(parseSecondsInput("   ", "functionalMs")).toBeNull();
    expect(parseSecondsInput("fast", "functionalMs")).toBeNull();
    expect(parseSecondsInput("Infinity", "cinematicMs")).toBeNull();
  });
});
