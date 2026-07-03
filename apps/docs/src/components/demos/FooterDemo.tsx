import { Footer } from "@kernelui-lib/react";

/** href is illustrative, not a real route — this demo shouldn't actually
 * navigate away from the docs page it's embedded in. */
function preventDemoNavigation(event: React.MouseEvent) {
  event.preventDefault();
}

export default function FooterDemo() {
  return (
    <Footer
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        inlineSize: "100%",
        padding: "var(--kernel-space-4)",
        border: "var(--kernel-border-width) solid var(--kernel-color-border)",
        borderRadius: "var(--kernel-radius-md)",
        color: "var(--kernel-color-text-muted)",
        fontSize: "var(--kernel-font-size-sm)",
      }}
    >
      <span>&copy; {new Date().getFullYear()} Acme Inc.</span>
      <a href="/privacy" onClick={preventDemoNavigation}>
        Privacy
      </a>
    </Footer>
  );
}
