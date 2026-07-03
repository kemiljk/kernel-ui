import { Switch } from "@kernelui-lib/react";

export default function NotificationToggle() {
  return (
    <div className="showcase-item">
      <div className="showcase-row-between">
        <div className="showcase-stack">
          <h3>Reduce motion</h3>
          <p>Respect prefers-reduced-motion automatically</p>
        </div>
        <Switch defaultChecked aria-label="Reduce motion" />
      </div>
    </div>
  );
}
