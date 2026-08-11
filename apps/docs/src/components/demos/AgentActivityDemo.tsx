import { AgentActivity, AgentActivityItem, Source, Sources } from "@kernelui-lib/react";

export default function AgentActivityDemo() {
  return (
    <AgentActivity style={{ inlineSize: "min(32rem, 100%)" }}>
      <AgentActivityItem kind="reasoning" label="Thought for 3s">
        The failing assertion is about the settle target, so the drag engine is the
        place to look before the component.
      </AgentActivityItem>
      <AgentActivityItem kind="search" label="Searched the repo for “settle”" defaultOpen>
        <Sources heading="Matches">
          <Source index={1} title="sheetDrag.ts" href="#" host="packages/react/src/utils" />
          <Source index={2} title="snapPoints.ts" href="#" host="packages/react/src/utils" />
        </Sources>
      </AgentActivityItem>
      <AgentActivityItem kind="tool" label="Ran the motion checks" status="complete">
        4 passed, 0 failed.
      </AgentActivityItem>
      <AgentActivityItem kind="trace" label="Wrote the fix to sheetDrag.ts" />
    </AgentActivity>
  );
}
