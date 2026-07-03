import { useState, type ReactNode } from "react";
import { Button, Switch, Tab, TabPanel, Tabs, TabsList, TextField } from "@kernelui-lib/react";
import CopyButton from "./CopyButton";
import { HighlightedCode } from "./HighlightedCode";

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
  /** The JSX a consumer would write for the current values, kept live in
   * the Usage section below the controls — this IS the page's usage
   * example now, not a second, separately-hardcoded one: a static
   * snippet sitting next to a live one that says the same thing at only
   * one specific set of values was pure repetition, and the two could
   * silently drift out of sync with each other. */
  code?: (values: PlaygroundValues) => string;
  /** Same values, serialised as the @kernelui-lib/elements custom-element
   * markup instead. Optional — when provided, the Usage section grows a
   * React/Web Components toggle; when omitted, Usage just shows `code`
   * on its own, same as before. */
  elementsCode?: (values: PlaygroundValues) => string;
}

/**
 * A live, prop-by-prop sandbox: the component up top reacting instantly to
 * the controls below it, so the whole surface of what a component can do is
 * explorable by clicking rather than by reading the props table and
 * imagining it. Deliberately built FROM the library's own Toggle / Switch /
 * TextField — the playground for a design system should itself be evidence
 * the components compose, not a bespoke set of controls that sidesteps them.
 */
export default function Playground({ controls, render, code, elementsCode }: PlaygroundProps) {
  const [values, setValues] = useState<PlaygroundValues>(() =>
    Object.fromEntries(controls.map((control) => [control.prop, control.default])),
  );

  function set(prop: string, value: string | boolean | number) {
    setValues((previous) => ({ ...previous, [prop]: value }));
  }

  const reactCode = code?.(values);
  const elementsCodeValue = elementsCode?.(values);

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

      {reactCode ? (
        <details className="usage-accordion">
          <summary className="usage-accordion-trigger">
            <span>Usage</span>
            <svg
              className="usage-accordion-chevron"
              viewBox="0 0 15 15"
              fill="currentColor"
              fillRule="evenodd"
              aria-hidden="true"
            >
              <path d="M3.135 6.158a.5.5 0 0 1 .707-.023L7.5 9.565l3.658-3.43a.5.5 0 0 1 .684.73l-4 3.75a.5.5 0 0 1-.684 0l-4-3.75a.5.5 0 0 1-.023-.707Z" />
            </svg>
          </summary>
          <div className="usage-accordion-content">
            {elementsCodeValue ? (
              <Tabs defaultValue="react" className="prop-playground-format-tabs">
                <TabsList aria-label="Code format">
                  <Tab value="react">React</Tab>
                  <Tab value="elements">Web Components</Tab>
                </TabsList>
                <TabPanel value="react" className="prop-playground-format-panel">
                  <div className="code-block">
                    <pre>
                      <code>
                        <HighlightedCode code={reactCode} />
                      </code>
                    </pre>
                    <CopyButton text={reactCode} />
                  </div>
                </TabPanel>
                <TabPanel value="elements" className="prop-playground-format-panel">
                  <div className="code-block">
                    <pre>
                      <code>
                        <HighlightedCode code={elementsCodeValue} />
                      </code>
                    </pre>
                    <CopyButton text={elementsCodeValue} />
                  </div>
                </TabPanel>
              </Tabs>
            ) : (
              <div className="code-block">
                <pre>
                  <code>
                    <HighlightedCode code={reactCode} />
                  </code>
                </pre>
                <CopyButton text={reactCode} />
              </div>
            )}
          </div>
        </details>
      ) : null}
    </div>
  );
}
