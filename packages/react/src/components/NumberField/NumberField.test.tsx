import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NumberField } from "./NumberField";

describe("NumberField steppers", () => {
  it("renders − then +, out of the tab order", () => {
    render(<NumberField label="Quantity" defaultValue={1} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.getAttribute("aria-label"))).toEqual(["Decrement", "Increment"]);
    for (const b of buttons) expect(b.tabIndex).toBe(-1);
  });

  it("disables each button at its bound", () => {
    render(<NumberField label="Quantity" defaultValue={0} min={0} max={1} />);
    expect((screen.getByRole("button", { name: "Decrement" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Increment" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Increment" }));
    expect((screen.getByLabelText("Quantity") as HTMLInputElement).value).toBe("1");
  });
});
