import { useState } from "react";
import { Switch } from "@kernelui/react";

export default function SwitchDemo() {
  const [checked, setChecked] = useState(true);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <Switch checked={checked} onCheckedChange={setChecked}>
        Notifications
      </Switch>
      <Switch defaultChecked={false} disabled>
        Disabled
      </Switch>
    </div>
  );
}
