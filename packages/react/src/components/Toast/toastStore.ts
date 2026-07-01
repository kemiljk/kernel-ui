import type { ReactNode } from "react";

export type ToastVariant = "default" | "success" | "warning" | "danger";

export interface ToastRecord {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  variant: ToastVariant;
  closing: boolean;
}

export interface ToastOptions {
  description?: ReactNode;
  /** Milliseconds before it dismisses itself. `0` means it stays until
   * the user closes it. */
  duration?: number;
}

let toasts: ToastRecord[] = [];
const listeners = new Set<() => void>();

// One timer entry per live toast: `remaining` is only ever stale while a
// timeout is actively running (in which case `timeoutId` is set and is the
// source of truth); once paused, `timeoutId` is cleared and `remaining`
// holds the accurate leftover time to resume from.
const timers = new Map<string, { timeoutId: ReturnType<typeof setTimeout> | null; remaining: number; startedAt: number }>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeToasts(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToastSnapshot() {
  return toasts;
}

const DEFAULT_DURATION = 4000;
const EXIT_DURATION = 200;

function scheduleTimer(id: string, duration: number) {
  timers.set(id, {
    timeoutId: setTimeout(() => dismissToast(id), duration),
    remaining: duration,
    startedAt: Date.now(),
  });
}

/** Stops the auto-dismiss countdown without losing the leftover time, so a
 * user reading or hovering a toast never has it disappear mid-read. */
export function pauseToast(id: string) {
  const timer = timers.get(id);
  if (!timer || timer.timeoutId === null) return;
  clearTimeout(timer.timeoutId);
  timer.remaining = Math.max(0, timer.remaining - (Date.now() - timer.startedAt));
  timer.timeoutId = null;
}

export function resumeToast(id: string) {
  const timer = timers.get(id);
  if (!timer || timer.timeoutId !== null || timer.remaining <= 0) return;
  scheduleTimer(id, timer.remaining);
}

/** Expanding the stack to actually read one toast shouldn't risk another
 * one behind it expiring while your attention is on the group — Sonner
 * pauses every toast's timer off a single shared `expanded` state for
 * exactly this reason, not each toast's own hover. */
export function pauseAllToasts() {
  for (const item of toasts) pauseToast(item.id);
}

export function resumeAllToasts() {
  for (const item of toasts) resumeToast(item.id);
}

function addToast(variant: ToastVariant, title: ReactNode, options?: ToastOptions) {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  toasts = [...toasts, { id, title, description: options?.description, variant, closing: false }];
  emit();

  const duration = options?.duration ?? DEFAULT_DURATION;
  if (duration > 0) {
    scheduleTimer(id, duration);
  }

  return id;
}

export function dismissToast(id: string) {
  const timer = timers.get(id);
  if (timer?.timeoutId) clearTimeout(timer.timeoutId);
  timers.delete(id);

  toasts = toasts.map((item) => (item.id === id ? { ...item, closing: true } : item));
  emit();
  setTimeout(() => {
    toasts = toasts.filter((item) => item.id !== id);
    emit();
  }, EXIT_DURATION);
}

/**
 * Imperative, like Sonner: call `toast(...)` from anywhere, no context
 * provider needed for the caller (`<ToastViewport />` still needs to be
 * mounted once, near the root, to actually render them). Every toast is
 * its own live region (`role="status"` or `role="alert"`, depending on
 * variant), so it announces itself as soon as it appears.
 */
export function toast(title: ReactNode, options?: ToastOptions) {
  return addToast("default", title, options);
}

toast.success = (title: ReactNode, options?: ToastOptions) => addToast("success", title, options);
toast.warning = (title: ReactNode, options?: ToastOptions) => addToast("warning", title, options);
toast.danger = (title: ReactNode, options?: ToastOptions) => addToast("danger", title, options);
toast.dismiss = dismissToast;
