import { useEffect, useState } from "react";
import { Button, Slider, Switch, Tab, Tabs, TabsList } from "@kernelui-lib/react";
import {
  ACCENTS,
  RADII,
  THEME_CHANGE_EVENT,
  applyAccent,
  applyColorScheme,
  applyRadius,
  getStoredAccent,
  getStoredColorScheme,
  getStoredRadiusName,
  type AccentName,
} from "../../lib/theme";
import CopyButton from "../CopyButton";

/** --kernel-space-unit in px. 4 is the library default (0.25rem). */
const DENSITY = { min: 3, max: 5, step: 0.5, default: 4 };

function capitalise(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function cssFor(accent: AccentName, radiusName: string, unit: number) {
  const radius = RADII.find((option) => option.name === radiusName) ?? RADII[0]!;
  const lines = [`  --kernel-radius-base: ${radius.value};`];
  if (radius.control) lines.push(`  --kernel-radius-control: ${radius.control};`);
  if (radius.container) lines.push(`  --kernel-radius-container: ${radius.container};`);
  if (radius.sheet) lines.push(`  --kernel-radius-sheet: ${radius.sheet};`);
  if (unit !== DENSITY.default) lines.push(`  --kernel-space-unit: ${unit / 16}rem;`);
  return `<html data-kernel-accent="${accent}">

<style>
:root {
${lines.join("\n")}
}
</style>`;
}

/**
 * The homepage's "make it yours" section, built out of the library
 * itself: accent swatches are Buttons, the radius picker is Tabs (so it
 * visibly re-shapes as you pick), density is the inset Slider, dark mode
 * is a Switch. Every control changes the real site — accent, radius and
 * scheme persist through src/lib/theme.ts exactly like the header's
 * theme menu — and the code beside them is the CSS that reproduces the
 * current look in your own app.
 *
 * Density deliberately doesn't persist: it rescales every gap and
 * control on the page, which is the point to try here, not something to
 * leave a visitor stuck with on every other docs page.
 */
export default function ThemeBuilder() {
  const [accent, setAccent] = useState<AccentName>("amber");
  const [radius, setRadius] = useState("Round");
  const [dark, setDark] = useState(false);
  const [unit, setUnit] = useState(DENSITY.default);

  useEffect(() => {
    function sync() {
      setAccent(getStoredAccent() ?? "amber");
      setRadius(getStoredRadiusName() ?? "Round");
      setDark(getStoredColorScheme() === "dark");
    }
    sync();
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, sync);
      document.documentElement.style.removeProperty("--kernel-space-unit");
    };
  }, []);

  function changeDensity(next: number) {
    setUnit(next);
    if (next === DENSITY.default) {
      document.documentElement.style.removeProperty("--kernel-space-unit");
    } else {
      document.documentElement.style.setProperty("--kernel-space-unit", `${next / 16}rem`);
    }
  }

  const css = cssFor(accent, radius, unit);

  return (
    <div className="theme-builder">
      <div className="theme-builder-controls">
        <fieldset className="theme-builder-field">
          <legend className="playground-label">Accent</legend>
          <div className="playground-row">
            {ACCENTS.map((name) => (
              <Button
                key={name}
                size="sm"
                variant={accent === name ? "primary" : "secondary"}
                aria-pressed={accent === name}
                onClick={() => {
                  setAccent(name);
                  applyAccent(name);
                }}
              >
                {capitalise(name)}
              </Button>
            ))}
          </div>
        </fieldset>

        <div className="theme-builder-field">
          <p className="playground-label" aria-hidden="true">
            Corners
          </p>
          <Tabs
            defaultValue="Round"
            value={radius}
            onValueChange={(name) => {
              const option = RADII.find((candidate) => candidate.name === name);
              if (!option) return;
              setRadius(name);
              applyRadius(option);
            }}
          >
            <TabsList aria-label="Corners">
              {RADII.map((option) => (
                <Tab key={option.name} value={option.name}>
                  {option.name}
                </Tab>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="theme-builder-field">
          <Slider
            label="Density"
            variant="inset"
            startLabel="Compact"
            endLabel="Roomy"
            min={DENSITY.min}
            max={DENSITY.max}
            step={DENSITY.step}
            value={unit}
            onValueChange={changeDensity}
            aria-valuetext={`${unit}px spacing unit`}
          />
        </div>

        <div className="theme-builder-field">
          <Switch
            checked={dark}
            onCheckedChange={(checked) => {
              setDark(checked);
              applyColorScheme(checked ? "dark" : "light");
            }}
          >
            Dark mode
          </Switch>
        </div>
      </div>

      <div className="theme-builder-output">
        <p className="playground-label">Your theme</p>
        <div className="code-block">
          <pre>
            <code>{css}</code>
          </pre>
          <CopyButton text={css} />
        </div>
        <p className="theme-builder-note">
          Every component on this page is already using it.
        </p>
      </div>
    </div>
  );
}
