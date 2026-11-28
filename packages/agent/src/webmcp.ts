/**
 * WebMCP (https://github.com/webmachinelearning/webmcp, W3C Web Machine
 * Learning Community Group draft): a page registers tools with
 * `document.modelContext.registerTool({ name, description, inputSchema,
 * execute, annotations }, { signal })`, and the browser's agent can call
 * them. Unregistering is aborting the signal. Experimental: only behind
 * flags or in preview builds, and the shape may still change, so every
 * call here is feature-detected and failures are swallowed.
 */

/** Hints from the draft's `ToolAnnotations` dictionary. */
export interface WebMcpToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
  consequentialHint?: boolean;
}

export interface WebMcpTool {
  name: string;
  title?: string;
  description: string;
  inputSchema?: object;
  annotations?: WebMcpToolAnnotations;
  execute: (input: Record<string, unknown>, options?: { signal?: AbortSignal }) => Promise<unknown>;
}

export interface ModelContextLike {
  registerTool(tool: WebMcpTool, options?: { signal?: AbortSignal }): unknown;
  /** Older previews and polyfills. */
  unregisterTool?(name: string): unknown;
}

/** `document.modelContext` per the current draft, falling back to the
 * `navigator.modelContext` that early previews and polyfills shipped. */
export function getModelContext(): ModelContextLike | null {
  const doc = typeof document !== "undefined" ? (document as Document & { modelContext?: ModelContextLike }) : undefined;
  const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { modelContext?: ModelContextLike }) : undefined;
  const context = doc?.modelContext ?? nav?.modelContext;
  return context && typeof context.registerTool === "function" ? context : null;
}

/** True when the browser exposes WebMCP's `registerTool`. */
export function isWebMcpAvailable(): boolean {
  return getModelContext() !== null;
}

/** Registers tools and returns one function that unregisters all of them.
 * A no-op (returning a no-op) when WebMCP isn't available. */
export function registerWebMcpTools(tools: WebMcpTool[]): () => void {
  const context = getModelContext();
  if (!context) return () => {};
  const controller = new AbortController();
  const handles: unknown[] = [];
  for (const tool of tools) {
    try {
      const result = context.registerTool(tool, { signal: controller.signal });
      if (result && typeof (result as Promise<unknown>).then === "function") {
        (result as Promise<unknown>).then(
          (handle) => handles.push(handle),
          (error: unknown) => console.warn(`[kernel/agent] WebMCP refused tool "${tool.name}":`, error),
        );
      } else {
        handles.push(result);
      }
    } catch (error) {
      console.warn(`[kernel/agent] WebMCP refused tool "${tool.name}":`, error);
    }
  }
  let done = false;
  return () => {
    if (done) return;
    done = true;
    controller.abort();
    for (const handle of handles) {
      // Some previews returned `{ unregister() }` instead of honouring the signal.
      try {
        (handle as { unregister?: () => void } | undefined)?.unregister?.();
      } catch {
        /* already gone */
      }
    }
    if (typeof context.unregisterTool === "function") {
      for (const tool of tools) {
        try {
          context.unregisterTool(tool.name);
        } catch {
          /* already gone */
        }
      }
    }
  };
}

export function textResult(text: string) {
  return { content: [{ type: "text", text }] };
}
