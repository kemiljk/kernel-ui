import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { useControllableState } from "./useControllableState";

function ControlledFixture({
  value,
  onChange,
}: {
  value?: string;
  onChange?: (value: string) => void;
}) {
  const [current, setCurrent] = useControllableState({
    value,
    defaultValue: "default",
    onChange,
  });
  return (
    <button type="button" onClick={() => setCurrent("next")}>
      {current}
    </button>
  );
}

describe("useControllableState", () => {
  it("uses defaultValue when uncontrolled", async () => {
    const user = userEvent.setup();
    render(<ControlledFixture />);
    await user.click(screen.getByRole("button", { name: "default" }));
    expect(screen.getByRole("button", { name: "next" })).toBeInTheDocument();
  });

  it("respects controlled value and calls onChange", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    function Wrapper() {
      const [value, setValue] = useState("controlled");
      return (
        <ControlledFixture
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
        />
      );
    }
    render(<Wrapper />);
    await user.click(screen.getByRole("button", { name: "controlled" }));
    expect(onChange).toHaveBeenCalledWith("next");
    expect(screen.getByRole("button", { name: "next" })).toBeInTheDocument();
  });
});
