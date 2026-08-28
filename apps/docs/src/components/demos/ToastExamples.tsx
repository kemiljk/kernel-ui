import { ToastViewport } from "@kernelui-lib/react";
import ToastDemo from "./ToastDemo";
import ToastPlayground from "./ToastPlayground";

/**
 * Keeps every interactive Toast example in one Astro island so both sets of
 * actions publish into the same, page-level viewport.
 */
export default function ToastExamples() {
  return (
    <>
      <div className="docs-example">
        <ToastDemo />
      </div>

      <h2>Playground</h2>
      <p>Toggle every adjustable prop and watch the component — and the code — update live.</p>
      <ToastPlayground />

      <ToastViewport />
    </>
  );
}
