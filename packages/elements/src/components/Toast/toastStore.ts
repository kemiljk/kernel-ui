export type ToastVariant = "default" | "success" | "warning" | "danger";
export type ToastContent = string | Node;

export interface ToastRecord {
  id: string;
  title: ToastContent;
  description?: ToastContent;
  variant: ToastVariant;
  closing: boolean;
}

export interface ToastOptions {
  description?: ToastContent;
  /** Milliseconds before it dismisses itself. `0` means it stays until
   * the user closes it. */
  duration?: number;
}

let toasts: ToastRecord[] = [];
const listeners = new Set<() => void>();

const timers = new Map<
  string,
  { timeoutId: ReturnType<typeof setTimeout> | null; remaining: number; startedAt: number }
>();

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

export function pauseAllToasts() {
  for (const item of toasts) pauseToast(item.id);
}

export function resumeAllToasts() {
  for (const item of toasts) resumeToast(item.id);
}

function addToast(variant: ToastVariant, title: ToastContent, options?: ToastOptions) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  toasts = [...toasts, { id, title, description: options?.description, variant, closing: false }];
  emit();

  const duration = options?.duration ?? DEFAULT_DURATION;
  if (duration > 0) scheduleTimer(id, duration);

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
 * Imperative, like Sonner and identical to `@kernelui/react`'s own
 * `toast()`: call it from anywhere, no setup beyond mounting a
 * `<kernel-toast-viewport>` once, near the root.
 */
export function toast(title: ToastContent, options?: ToastOptions) {
  return addToast("default", title, options);
}

toast.success = (title: ToastContent, options?: ToastOptions) => addToast("success", title, options);
toast.warning = (title: ToastContent, options?: ToastOptions) => addToast("warning", title, options);
toast.danger = (title: ToastContent, options?: ToastOptions) => addToast("danger", title, options);
toast.dismiss = dismissToast;
