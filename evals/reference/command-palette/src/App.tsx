import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button, CommandPalette, Header, Kbd, type CommandPaletteGroup } from "@kernelui-lib/react";

const COMMANDS = {
  navigation: ["Go to Dashboard", "Go to Settings", "Go to Billing"],
  actions: ["New project", "Invite teammate", "Toggle theme"],
};

const toId = (label: string) => label.toLowerCase().replace(/\s+/g, "-");

export default function App() {
  const [open, setOpen] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  // Cmd+K on Apple platforms, Ctrl+K elsewhere; toggles so the same
  // shortcut also closes it.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const groups = useMemo<CommandPaletteGroup[]>(
    () => [
      { id: "navigation", label: "Navigation", items: COMMANDS.navigation.map((label) => ({ id: toId(label), label, onSelect: () => setLastRun(label) })) },
      { id: "actions", label: "Actions", items: COMMANDS.actions.map((label) => ({ id: toId(label), label, onSelect: () => setLastRun(label) })) },
    ],
    [],
  );

  return (
    <>
      <Header className="app-header">
        <strong className="brand">Acme</strong>
        <Button variant="secondary" iconStart={<Search />} onClick={() => setOpen(true)}>
          Search commands <Kbd keys={["mod", "K"]} />
        </Button>
      </Header>
      <main className="page">
        <h1>Dashboard</h1>
        <p role="status">{lastRun ? `Ran: ${lastRun}` : null}</p>
      </main>
      <CommandPalette open={open} onOpenChange={setOpen} groups={groups} placeholder="Search commands" emptyMessage="No matching commands" />
    </>
  );
}
