import { cloneElement, createElement, isValidElement } from "react";
import type { ElementType, ReactElement, Ref, RefCallback, RefObject } from "react";

/**
 * Every Kernel component renders a real element by default (a `button`,
 * an `input`, a `details`) and accepts an explicit `render` prop when you
 * need to swap it for something else, following Base UI's pattern rather
 * than Radix's `asChild` magic: what gets rendered is always visible at
 * the call site.
 *
 *   <Button render={<a href="/pricing" />}>Pricing</Button>
 *
 * `render` can also be a function of the computed state, for cases where
 * the replacement element needs to react to it.
 */
export type RenderProp<TState = Record<string, never>> =
  | ReactElement
  | ((props: Record<string, unknown>, state: TState) => ReactElement);

export function renderElement<TState>(
  render: RenderProp<TState> | undefined,
  defaultElement: ElementType,
  props: Record<string, unknown>,
  state: TState,
): ReactElement {
  if (typeof render === "function") {
    return render(props, state);
  }

  if (render && isValidElement(render)) {
    return cloneElement(
      render,
      mergeProps(render.props as Record<string, unknown>, props),
    );
  }

  return createElement(defaultElement, props);
}

function mergeProps(
  outer: Record<string, unknown>,
  inner: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...outer, ...inner };

  for (const key of Object.keys(inner)) {
    if (key === "className") {
      merged.className = [outer.className, inner.className]
        .filter(Boolean)
        .join(" ");
      continue;
    }

    if (key === "style" && outer.style && inner.style) {
      merged.style = { ...(outer.style as object), ...(inner.style as object) };
      continue;
    }

    const outerValue = outer[key];
    const innerValue = inner[key];
    if (
      key.startsWith("on") &&
      typeof outerValue === "function" &&
      typeof innerValue === "function"
    ) {
      merged[key] = (...args: unknown[]) => {
        (innerValue as (...a: unknown[]) => void)(...args);
        (outerValue as (...a: unknown[]) => void)(...args);
      };
    }
  }

  return merged;
}

/** `className` as a plain string, or derived from component state, mirroring
 * React Aria's styling API so CSS can react to state without extra JS. */
export type ClassNameValue<TState> = string | ((state: TState) => string) | undefined;

export function resolveClassName<TState>(
  value: ClassNameValue<TState>,
  state: TState,
): string | undefined {
  return typeof value === "function" ? value(state) : value;
}

/** Presence-based data attribute: renders `data-foo=""` when true, and is
 * omitted entirely when false, so `[data-foo]` selectors just work in CSS. */
export function dataAttr(condition: boolean | undefined): true | undefined {
  return condition ? true : undefined;
}

export function mergeRefs<T>(
  ...refs: Array<Ref<T> | undefined>
): RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as RefObject<T | null>).current = node;
    }
  };
}
