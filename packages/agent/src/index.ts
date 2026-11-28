/**
 * @kernelui-lib/agent: let an in-page AI agent read and operate a UI
 * through the semantics a screen reader uses, not a parallel JS store.
 *
 *   const agent = createAgentBridge({ root: document.querySelector("main") });
 *   agent.snapshot();                       // roles, names, states, refs
 *   await agent.act({ steps: [{ ref: "e3", action: "check" }] });
 *   agent.registerTools();                  // WebMCP, when the browser has it
 */
export { createAgentBridge, createTools, confirmReasonFor } from "./bridge.js";
export { formatSnapshot, diffSnapshots, REDACTED } from "./snapshot.js";
export { accessibleName, accessibleDescription, roleOf, kernelComponentOf, isSecretField } from "./dom.js";
export { isWebMcpAvailable, getModelContext } from "./webmcp.js";
export type { WebMcpTool, WebMcpToolAnnotations, ModelContextLike } from "./webmcp.js";
export { AGENT_ACTIONS } from "./types.js";
export type {
  ActOptions,
  ActResult,
  AgentAction,
  AgentBridge,
  AgentBridgeOptions,
  AgentStep,
  AgentStepArgs,
  AllowContext,
  AllowDecision,
  Checked,
  ConfirmReason,
  ConfirmRequest,
  ElementFilter,
  NodeChange,
  ObserveOptions,
  QueryOptions,
  RegisterToolsOptions,
  SettleOptions,
  Snapshot,
  SnapshotDiff,
  SnapshotNode,
  SnapshotOption,
  StepResult,
} from "./types.js";
