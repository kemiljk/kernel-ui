import { Callout } from "@kernelui-lib/react";

export default function OpenSourceCallout() {
  return (
    <Callout className="closing-callout" variant="warning" title="On LLMs">
      Drive-by, untested LLM spam is not welcome. Bulk-generated PRs with no
      context or review do not help. Using an LLM to explore the codebase,
      draft a patch, or write tests is fine. Every contribution needs a human
      who can explain the change and stand behind it.
    </Callout>
  );
}
