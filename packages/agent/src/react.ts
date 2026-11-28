import { useEffect, useRef, useState, type RefObject } from "react";
import { createAgentBridge } from "./bridge.js";
import type { AgentBridge, AgentBridgeOptions, RegisterToolsOptions } from "./types.js";

export interface UseAgentBridgeOptions extends Omit<AgentBridgeOptions, "root"> {
  /** The element to scope the agent to: a ref or an element. Defaults to
   * `document.body`. */
  root?: RefObject<Element | null> | Element | null;
  /** Register snapshot/act/query as WebMCP tools while mounted (a no-op
   * where WebMCP is unavailable). `true` uses the `kernel` prefix. */
  registerTools?: boolean | RegisterToolsOptions;
}

function resolveRoot(root: UseAgentBridgeOptions["root"]): Element | null | undefined {
  if (root && typeof root === "object" && "current" in root) return root.current;
  return root;
}

/**
 * Creates an agent bridge on mount and tears it down on unmount
 * (observers stopped, WebMCP tools unregistered). Returns `null` until
 * mounted. `allow`, `confirm`, `include` and `exclude` are read from the
 * latest render, so passing inline functions doesn't recreate the bridge.
 */
export function useAgentBridge(options: UseAgentBridgeOptions = {}): AgentBridge | null {
  const [bridge, setBridge] = useState<AgentBridge | null>(null);
  const latest = useRef(options);
  latest.current = options;
  const registerKey =
    options.registerTools === true ? "kernel" : options.registerTools ? (options.registerTools.prefix ?? "kernel") : "";

  useEffect(() => {
    const current = latest.current;
    const root = resolveRoot(current.root);
    if (current.root && !root) return; // A ref that isn't attached yet.
    const instance = createAgentBridge({
      root: root ?? undefined,
      maxNodes: current.maxNodes,
      include: (el) => {
        const filter = latest.current.include;
        if (!filter) return true;
        return typeof filter === "function" ? filter(el) : safeMatches(el, filter);
      },
      exclude: (el) => {
        const filter = latest.current.exclude;
        if (!filter) return false;
        return typeof filter === "function" ? filter(el) : safeMatches(el, filter);
      },
      allow: (step, target, context) => {
        const allow = latest.current.allow;
        if (allow) return allow(step, target, context);
        return context.confirmReason ? "confirm" : true;
      },
      confirm: latest.current.confirm ? (request) => latest.current.confirm!(request) : undefined,
    });
    const unregister = registerKey ? instance.registerTools({ prefix: registerKey }) : undefined;
    setBridge(instance);
    return () => {
      unregister?.();
      instance.destroy();
      setBridge(null);
    };
    // Recreate only when the root (a ref object is stable; its element is
    // attached by the time effects run) or tool registration changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.root, registerKey]);

  return bridge;
}

function safeMatches(el: Element, selector: string): boolean {
  try {
    return el.matches(selector);
  } catch {
    return false;
  }
}
