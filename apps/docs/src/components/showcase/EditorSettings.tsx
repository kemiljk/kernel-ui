import { Slider, Switch } from "@kernelui-lib/react";

export default function EditorSettings() {
  return (
    <div className="showcase-item">
      <Slider label="Font size" showValue defaultValue={15} min={10} max={24} />
      <div className="showcase-row-between">
        <p>Ligatures</p>
        <Switch defaultChecked aria-label="Ligatures" />
      </div>
    </div>
  );
}
