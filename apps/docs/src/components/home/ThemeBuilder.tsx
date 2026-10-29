import { useEffect, useState } from "react";
import { Button, Sheet, Slider, Switch, Tab, Tabs, TabsList } from "@kernelui-lib/react";
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

const PANEL_ID = "theme-panel";
/** Below this the panel would cover most of the page; a sheet takes over. */
const NARROW_QUERY = "(width < 800px)";

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
 *
 * The controls live outside the page flow, because density reflows the
 * whole page: in-flow, the panel you're dragging the slider in would
 * move under your pointer. On wide screens they sit in a non-modal
 * native `popover` (top layer, so no transformed ancestor can capture
 * its `position: fixed`, and the page stays scrollable to watch it
 * change); on narrow ones, in Kernel's bottom Sheet. Both pin their own
 * spacing scale (`.theme-panel-scope`), so the panel itself never
 * resizes as density changes.
 */
export default function ThemeBuilder() {
  const [accent, setAccent] = useState<AccentName>("amber");
  const [radius, setRadius] = useState("Round");
  const [dark, setDark] = useState(false);
  const [unit, setUnit] = useState(DENSITY.default);
  const [narrow, setNarrow] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(NARROW_QUERY);
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

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
    // Density reflows everything above the fold too, so without help the
    // content you're looking at slides off-screen. Hold whatever sits at
    // the middle of the viewport (beside the panel) in place: measure it,
    // apply the change, and scroll by however far it moved.
    const anchor = document.elementFromPoint(window.innerWidth * 0.3, window.innerHeight / 2);
    const anchored = anchor && !anchor.closest(".theme-panel-scope") ? anchor : null;
    const before = anchored?.getBoundingClientRect().top;
    if (next === DENSITY.default) {
      document.documentElement.style.removeProperty("--kernel-space-unit");
    } else {
      document.documentElement.style.setProperty("--kernel-space-unit", `${next / 16}rem`);
    }
    if (anchored && before !== undefined) {
      window.scrollBy({ top: anchored.getBoundingClientRect().top - before, behavior: "instant" });
    }
  }

  const css = cssFor(accent, radius, unit);

  const controls = (
    <>
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
    </>
  );

  return (
    <div className="theme-launch">
      <Button
        variant="primary"
        // Wide: the native popover toggle, no JS state. Narrow: the sheet.
        popoverTarget={narrow ? undefined : PANEL_ID}
        onClick={narrow ? () => setSheetOpen(true) : undefined}
      >
        Customise theme
      </Button>
      <p className="theme-launch-note">
        Opens beside the page, so you can scroll around and watch it change.
      </p>

      {narrow ? (
        <Sheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title="Theme"
          classNames={{ root: "theme-panel-scope" }}
          maxDisplayWidth={799}
        >
          <div className="theme-panel-body">{controls}</div>
        </Sheet>
      ) : (
        <aside
          id={PANEL_ID}
          popover="manual"
          aria-label="Theme"
          className="theme-panel theme-panel-scope"
          onKeyDown={(event) => {
            if (event.key === "Escape") event.currentTarget.hidePopover();
          }}
        >
          <div className="theme-panel-header">
            <h3>Theme</h3>
            <Button
              variant="ghost"
              size="sm"
              popoverTarget={PANEL_ID}
              popoverTargetAction="hide"
            >
              Close
            </Button>
          </div>
          <div className="theme-panel-body">{controls}</div>
        </aside>
      )}
    </div>
  );
}
