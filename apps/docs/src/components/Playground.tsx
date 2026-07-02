import { useState, type ReactNode } from "react";
import { Button, Switch, TextField } from "@kernelui/react";

/** One adjustable prop. `prop` is the key handed back to `render`/`code`.
 * Kept intentionally small — enum (pick one), boolean (on/off), and text
 * (free string, also used for a component's `children`) cover every
 * adjustable prop across the library today; add a `number` variant here
 * when the first slider-min/max-style playground actually needs one,
 * rather than speculatively now. */
type EnumControl = {
  type: "enum";
  prop: string;
  label?: string;
  options: string[];
  default: string;
};
type BooleanControl = { type: "boolean"; prop: string; label?: string; default: boolean };
type TextControl = {
  type: "text";
  prop: string;
  label?: string;
  default: string;
  placeholder?: string;
};
type NumberControl = {
  type: "number";
  prop: string;
  label?: string;
  default: number;
  min?: number;
  max?: number;
  step?: number;
};

export type PlaygroundControl =
  | EnumControl
  | BooleanControl
  | TextControl
  | NumberControl;
export type PlaygroundValues = Record<string, string | boolean | number>;

export interface PlaygroundProps {
  /** The adjustable props, rendered as a control per row in declaration order. */
  controls: PlaygroundControl[];
  /** Renders the live component from the current values. */
  render: (values: PlaygroundValues) => ReactNode;
  /** Optional: the JSX a consumer would write for the current values, shown
   * live beneath the controls. Kept as a caller-supplied function rather
   * than derived automatically so each component controls exactly how its
   * own props serialise (which to omit at default, how children read). */
  code?: (values: PlaygroundValues) => string;
}

/**
 * A live, prop-by-prop sandbox: the component up top reacting instantly to
 * the controls below it, so the whole surface of what a component can do is
 * explorable by clicking rather than by reading the props table and
 * imagining it. Deliberately built FROM the library's own Toggle / Switch /
 * TextField — the playground for a design system should itself be evidence
 * the components compose, not a bespoke set of controls that sidesteps them.
 */
export default function Playground({ controls, render, code }: PlaygroundProps) {
  const [values, setValues] = useState<PlaygroundValues>(() =>
    Object.fromEntries(controls.map((control) => [control.prop, control.default])),
  );

  function set(prop: string, value: string | boolean | number) {
    setValues((previous) => ({ ...previous, [prop]: value }));
  }

  return (
    <div className="prop-playground">
      <div className="prop-playground-stage">{render(values)}</div>

      <div className="prop-playground-panel">
        {controls.map((control) => {
          const label = control.label ?? control.prop;

          if (control.type === "text") {
            return (
              <TextField
                key={control.prop}
                size="sm"
                label={label}
                value={String(values[control.prop] ?? "")}
                placeholder={control.placeholder}
                wrapperClassName="prop-playground-text"
                onChange={(event) => set(control.prop, event.target.value)}
              />
            );
          }

          if (control.type === "number") {
            return (
              <div className="prop-playground-field" key={control.prop}>
                <span className="prop-playground-field-label">{label}</span>
                <input
                  type="number"
                  className="prop-playground-number"
                  value={Number(values[control.prop] ?? 0)}
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  aria-label={label}
                  onChange={(event) => set(control.prop, event.target.valueAsNumber)}
                />
              </div>
            );
          }

          return (
            <div className="prop-playground-field" key={control.prop}>
              <span className="prop-playground-field-label">{label}</span>
              {control.type === "enum" ? (
                <div
                  className="prop-playground-segments"
                  role="group"
                  aria-label={label}
                >
                  {control.options.map((option) => {
                    const selected = values[control.prop] === option;
                    // Button, not Toggle, for text-labelled segments: Toggle
                    // is a fixed-size SQUARE (built for toolbar icon buttons),
                    // so word labels like "secondary" collapse in it. Button
                    // sizes to its text. Selected reads as `secondary`
                    // (bordered, filled) against the others' borderless
                    // `ghost`, and `aria-pressed` carries the actual state.
                    return (
                      <Button
                        key={option}
                        size="sm"
                        variant={selected ? "secondary" : "ghost"}
                        aria-pressed={selected}
                        onClick={() => set(control.prop, option)}
                      >
                        {option}
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <Switch
                  checked={Boolean(values[control.prop])}
                  aria-label={label}
                  onCheckedChange={(checked) => set(control.prop, checked)}
                />
              )}
            </div>
          );
        })}
      </div>

      {code ? (
        <pre className="prop-playground-code">
          <code>{code(values)}</code>
        </pre>
      ) : null}
    </div>
  );
}
