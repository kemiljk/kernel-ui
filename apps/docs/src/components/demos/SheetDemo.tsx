import { useState } from "react";
import { Button, Sheet } from "@kernelui-lib/react";

const tracks = [
  "Weightless — Marconi Union",
  "An Ending (Ascent) — Brian Eno",
  "Avril 14th — Aphex Twin",
  "Rhubarb — Aphex Twin",
  "Everything In Its Right Place — Radiohead",
  "Svefn-g-englar — Sigur Rós",
  "Teardrop — Massive Attack",
  "Nightcall — Kavinsky",
  "Intro — The xx",
  "Open Eye Signal — Jon Hopkins",
];

export default function SheetDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Recently played
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Recently played"
        description="Drag the sheet down, or grab the handle, to dismiss it."
        handleOnly
      >
        {/* The scrolling body clips at its inline edge, and an `outside` marker
            paints beyond the list's own box, so the padding has to cover the
            widest marker — "10." is 23px at this size. 2.25rem leaves room for
            three digits too. */}
        <ol style={{ display: "grid", gap: "0.75rem", margin: 0, paddingInlineStart: "2.25rem" }}>
          {tracks.map((track) => (
            <li key={track}>{track}</li>
          ))}
        </ol>
      </Sheet>
    </>
  );
}
