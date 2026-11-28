import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UsageMeter, usageMeterLevel } from "./UsageMeter";

describe("UsageMeter", () => {
  it("renders a labelled native meter with formatted value text", () => {
    const { container } = render(
      <UsageMeter label="Context window" value={12_340} max={200_000} unit="tokens" locale="en-US" />,
    );
    const meter = screen.getByRole("meter", { name: "Context window" });
    expect(meter.tagName).toBe("METER");
    expect(meter).toHaveAttribute("value", "12340");
    expect(meter).toHaveAttribute("max", "200000");
    expect(meter).toHaveAttribute("aria-valuetext", "12,340 / 200,000 tokens");
    expect(screen.getByText("12,340 / 200,000 tokens")).toHaveAttribute("aria-hidden", "true");
    expect(container.firstElementChild).toHaveAttribute("data-level", "ok");
  });

  it("turns to warning above high and danger at the limit", () => {
    const { container, rerender } = render(
      <UsageMeter label="Credits" value={170} max={200} high={160} />,
    );
    expect(container.firstElementChild).toHaveAttribute("data-level", "warning");
    rerender(<UsageMeter label="Credits" value={200} max={200} high={160} />);
    expect(container.firstElementChild).toHaveAttribute("data-level", "danger");
  });

  it("supports a custom formatter and description", () => {
    render(
      <UsageMeter
        label="Storage"
        value={3}
        max={10}
        formatValue={(value, max) => `${value} of ${max} GB`}
        description="Resets on the 1st."
      />,
    );
    const meter = screen.getByRole("meter", { name: "Storage" });
    expect(meter).toHaveAttribute("aria-valuetext", "3 of 10 GB");
    expect(meter).toHaveAccessibleDescription("Resets on the 1st.");
  });
});

describe("usageMeterLevel", () => {
  it("follows the HTML meter region algorithm with optimum at min", () => {
    const bands = { max: 100, low: 60, high: 85 };
    expect(usageMeterLevel({ ...bands, value: 40 })).toBe("ok");
    expect(usageMeterLevel({ ...bands, value: 70 })).toBe("warning");
    expect(usageMeterLevel({ ...bands, value: 90 })).toBe("danger");
  });

  it("treats a full meter as fine when more is better", () => {
    expect(usageMeterLevel({ value: 100, max: 100, optimum: 100, low: 20 })).toBe("ok");
    expect(usageMeterLevel({ value: 10, max: 100, optimum: 100, low: 20, high: 50 })).toBe("danger");
  });
});
