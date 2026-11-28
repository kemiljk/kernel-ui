import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dialog } from "../components/Dialog/Dialog";
import { resetDeprecationWarnings, warnDeprecated } from "./warnDeprecated";

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetDeprecationWarnings();
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  warn.mockRestore();
  vi.unstubAllEnvs();
});

describe("warnDeprecated", () => {
  it("warns once per component and message", () => {
    warnDeprecated("Thing", "`a` is deprecated. Use `b` instead.");
    warnDeprecated("Thing", "`a` is deprecated. Use `b` instead.");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("[Kernel UI] Thing: `a` is deprecated. Use `b` instead.");
  });

  it("keeps different messages and different components apart", () => {
    warnDeprecated("Thing", "`a` is deprecated.");
    warnDeprecated("Thing", "`c` is deprecated.");
    warnDeprecated("Other", "`a` is deprecated.");
    expect(warn).toHaveBeenCalledTimes(3);
  });

  it("is silent in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    warnDeprecated("Thing", "`a` is deprecated.");
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("Dialog's deprecated className", () => {
  it("warns once, naming the replacement, however many dialogs render it", () => {
    render(
      <>
        <Dialog open={false} onOpenChange={() => {}} title="One" className="legacy" />
        <Dialog open={false} onOpenChange={() => {}} title="Two" className="legacy" />
      </>,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain("classNames.root");
  });

  it("doesn't warn for classNames.root", () => {
    render(<Dialog open={false} onOpenChange={() => {}} title="One" classNames={{ root: "modern" }} />);
    expect(warn).not.toHaveBeenCalled();
  });

  it("doesn't warn in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    render(<Dialog open={false} onOpenChange={() => {}} title="One" className="legacy" />);
    expect(warn).not.toHaveBeenCalled();
  });
});
