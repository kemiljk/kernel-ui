import { useState, type KeyboardEvent } from "react";
import { Bold, Italic, MoreHorizontal, Underline } from "lucide-react";
import { Button, DropdownMenu, MenuChevron, MenuItem, MenuSeparator, Separator, Toggle } from "@kernelui-lib/react";

type Format = "bold" | "italic" | "underline";

/** Left/Right/Home/End move between the toolbar's buttons, as the WAI-ARIA toolbar pattern expects. */
function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
  const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
  if (!keys.includes(event.key)) return;
  const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>(":scope > button, :scope > * > button")];
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
  if (index === -1) return;
  event.preventDefault();
  const next =
    event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
  buttons[next].focus();
}

export default function App() {
  const [formats, setFormats] = useState<Record<Format, boolean>>({ bold: false, italic: false, underline: false });
  const [lastAction, setLastAction] = useState<string | null>(null);
  const setFormat = (format: Format) => (pressed: boolean) => setFormats((current) => ({ ...current, [format]: pressed }));

  return (
    <main className="page">
      <h1>Quarterly report</h1>
      <div role="toolbar" aria-label="Formatting" className="toolbar" onKeyDown={moveFocus}>
        <Toggle aria-label="Bold" pressed={formats.bold} onPressedChange={setFormat("bold")}>
          <Bold aria-hidden="true" />
        </Toggle>
        <Toggle aria-label="Italic" pressed={formats.italic} onPressedChange={setFormat("italic")}>
          <Italic aria-hidden="true" />
        </Toggle>
        <Toggle aria-label="Underline" pressed={formats.underline} onPressedChange={setFormat("underline")}>
          <Underline aria-hidden="true" />
        </Toggle>
        <Separator orientation="vertical" />
        <DropdownMenu
          render={
            <Button variant="ghost" iconEnd={<MenuChevron />}>
              Insert
            </Button>
          }
        >
          <MenuItem onSelect={() => setLastAction("Image")}>Image</MenuItem>
          <MenuItem onSelect={() => setLastAction("Table")}>Table</MenuItem>
          <MenuItem onSelect={() => setLastAction("Divider")}>Divider</MenuItem>
        </DropdownMenu>
        <DropdownMenu align="end" render={<Button variant="ghost" aria-label="More actions" iconStart={<MoreHorizontal />} />}>
          <MenuItem onSelect={() => setLastAction("Rename")}>Rename</MenuItem>
          <MenuItem onSelect={() => setLastAction("Duplicate")}>Duplicate</MenuItem>
          <MenuSeparator />
          <MenuItem destructive onSelect={() => setLastAction("Delete")}>
            Delete
          </MenuItem>
        </DropdownMenu>
      </div>
      <p role="status" className="status">
        {lastAction ? `Last action: ${lastAction}` : null}
      </p>
      <article
        className="document"
        data-bold={formats.bold || undefined}
        data-italic={formats.italic || undefined}
        data-underline={formats.underline || undefined}
      >
        <p>
          Revenue grew in every region this quarter, led by a strong launch in the Nordics. Operating costs held flat while
          headcount rose by twelve.
        </p>
        <p>Next quarter we focus on retention: onboarding, billing clarity and faster support replies.</p>
      </article>
    </main>
  );
}
