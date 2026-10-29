import { Accordion, AccordionItem, Badge } from "@kernelui-lib/react";

export interface Release {
  version: string;
  level: string;
  changes: string[];
}

/** Changelog text keeps its `code spans`; everything else stays text. */
function withCode(text: string) {
  return text.split(/(`[^`]+`)/).map((part, index) =>
    part.startsWith("`") && part.endsWith("`") ? <code key={index}>{part.slice(1, -1)}</code> : part,
  );
}

/**
 * Latest releases, straight from the published package's CHANGELOG.md
 * at build time. Rendered with Kernel's Accordion and no client
 * directive: it's `<details>`/`<summary>`, so it opens and closes with
 * zero JavaScript on the page.
 */
export default function Releases({ releases }: { releases: Release[] }) {
  return (
    <Accordion type="multiple" className="releases">
      {releases.map((release, index) => (
        <AccordionItem
          key={release.version}
          defaultOpen={index === 0}
          title={
            <span className="releases-title">
              <span>@kernelui-lib/react {release.version}</span>
              <Badge variant={release.level === "Major" ? "danger" : release.level === "Minor" ? "accent" : "neutral"}>
                {release.level}
              </Badge>
            </span>
          }
        >
          <ul className="releases-list">
            {release.changes.map((change, changeIndex) => (
              <li key={changeIndex}>{withCode(change)}</li>
            ))}
          </ul>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
