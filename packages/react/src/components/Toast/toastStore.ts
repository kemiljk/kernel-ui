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

function addToast(variant: ToastVariant, title: ReactNode, options?: ToastOptions) {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  toasts = [...toasts, { id, title, description: options?.description, variant, closing: false }];
  emit();

  const duration = options?.duration ?? DEFAULT_DURATION;
  if (duration > 0) {
    setTimeout(() => dismissToast(id), duration);
  }

  return id;
}

export function dismissToast(id: string) {
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
