import { Checkbox, Switch } from "@kernelui-lib/react";

/**
 * Two distinct, individually-labelled settings rows, not a single row
 * cramming a checkbox, a switch, a progress spinner, and stray text
 * together with nothing to say which control does what. Progress
 * (dropped from the original version of this card) never actually fit
 * "preferences" as a concept — it was a different UI idea bolted onto
 * this one for no reason beyond "there was room."
 */
export default function StatusRow() {
  return (
    <div className="showcase-item">
      <h3>Preferences</h3>
      <div className="showcase-stack">
        <Checkbox defaultChecked>Auto-save changes</Checkbox>
        <div className="showcase-row-between">
          <p>Dark mode</p>
          <Switch defaultChecked aria-label="Dark mode" />
        </div>
      </div>
    </div>
  );
}
