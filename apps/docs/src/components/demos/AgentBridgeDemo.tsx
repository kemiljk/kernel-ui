import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, CodeBlock, Dialog, Select, SelectOption, Switch, TextField, ToolApproval } from "@kernelui-lib/react";
import { formatSnapshot, type ActResult, type ConfirmRequest } from "@kernelui-lib/agent";
import { useAgentBridge } from "@kernelui-lib/agent/react";

let promptId = 0;

/** The `confirm` callback from the guide: shows Kernel's ToolApproval and
 * resolves with the person's decision. */
function confirmWithToolApproval(show: (prompt: ReactNode) => void) {
  return (request: ConfirmRequest) =>
    new Promise<boolean>((resolve) => {
      show(
        <ToolApproval
          key={++promptId}
          tool={`agent.${request.step.action}`}
          onApprove={() => resolve(true)}
          onDeny={() => resolve(false)}
        >
          {request.message}
        </ToolApproval>,
      );
    });
}

const PLANS = { free: "Free", pro: "Pro", team: "Team" } as const;
type Plan = keyof typeof PLANS;

export default function AgentBridgeDemo() {
  const stage = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [updates, setUpdates] = useState(false);
  const [plan, setPlan] = useState<Plan>("free");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [saved, setSaved] = useState("");
  const [prompt, setPrompt] = useState<ReactNode>(null);
  const [snapshotText, setSnapshotText] = useState("");
  const [lastResult, setLastResult] = useState<ActResult | null>(null);
  const [running, setRunning] = useState(false);

  // registerTools: in a browser with WebMCP, the page's agent gets
  // kernel_snapshot / kernel_act / kernel_query scoped to this demo.
  const agent = useAgentBridge({ root: stage, confirm: confirmWithToolApproval(setPrompt), registerTools: true });

  useEffect(() => {
    if (!agent) return;
    setSnapshotText(formatSnapshot(agent.snapshot()));
    const stop = agent.observe((_diff, snapshot) => setSnapshotText(formatSnapshot(snapshot)), { debounce: 100 });
    // So you can try it from the console: kernelAgentDemo.snapshot()
    (window as unknown as { kernelAgentDemo?: unknown }).kernelAgentDemo = agent;
    return () => {
      stop();
      delete (window as unknown as { kernelAgentDemo?: unknown }).kernelAgentDemo;
    };
  }, [agent]);

  async function runSample() {
    if (!agent) return;
    setRunning(true);
    try {
      const ref = (role: string, name: string) => agent.query({ role, name })[0]?.ref ?? "missing";
      let result = await agent.act({
        steps: [
          { ref: ref("textbox", "Name"), action: "type", args: { text: "Ada Lovelace" } },
          { ref: ref("switch", "Email me product updates"), action: "check" },
          { ref: ref("combobox", "Plan"), action: "select", args: { value: "Team" } },
          { ref: ref("button", "Invite a teammate"), action: "press" },
        ],
      });
      setLastResult(result);
      if (!result.ok) return;
      const dialog = agent.query({ role: "dialog" })[0];
      if (dialog?.ref) {
        result = await agent.act({ steps: [{ ref: dialog.ref, action: "close" }] });
        setLastResult(result);
      }
      // Pressing a submit button needs a person: the ToolApproval appears.
      result = await agent.act({ steps: [{ ref: ref("button", "Save settings"), action: "press" }] });
      setLastResult(result);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="agent-demo">
      <div ref={stage} className="agent-demo-stage">
        <form
          aria-label="Account settings"
          className="agent-demo-form"
          onSubmit={(event) => {
            event.preventDefault();
            setSaved(`Saved ${name || "an unnamed account"} on the ${PLANS[plan]} plan, ${updates ? "with" : "without"} product updates.`);
          }}
        >
          <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" />
          <Select label="Plan" value={plan} onChange={(event) => setPlan(event.target.value as Plan)}>
            {Object.entries(PLANS).map(([value, label]) => (
              <SelectOption key={value} value={value}>
                {label}
              </SelectOption>
            ))}
          </Select>
          <Switch checked={updates} onCheckedChange={setUpdates}>
            Email me product updates
          </Switch>
          <div className="agent-demo-actions">
            <Button type="button" variant="secondary" onClick={() => setInviteOpen(true)}>
              Invite a teammate
            </Button>
            <Button type="submit" variant="primary">
              Save settings
            </Button>
          </div>
          <p role="status" className="agent-demo-status">
            {saved}
          </p>
        </form>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen} title="Invite a teammate" description="They'll get an email with a link to join.">
          <TextField label="Email address" type="email" placeholder="teammate@example.com" />
        </Dialog>
      </div>

      {/* Outside the bridge's root, and ignored besides: an agent must
          never be able to press its own Approve button. */}
      <div className="agent-demo-panel" data-kernel-agent-ignore>
        <Button variant="primary" onClick={runSample} loading={running} disabled={!agent || running}>
          Run sample agent steps
        </Button>
        {prompt}
        <CodeBlock label="agent.snapshot()" language="text" code={snapshotText || " "} maxBlockSize="18rem" />
        {lastResult ? (
          <CodeBlock label="Last act() result" language="json" code={JSON.stringify(lastResult, null, 2)} maxBlockSize="14rem" />
        ) : null}
      </div>
    </div>
  );
}
