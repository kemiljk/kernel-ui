import { useEffect, useState } from "react";
import { Avatar, Badge, Button, Card, CardContent, Checkbox, Switch, TextField } from "@kernelui/react";
import { THEME_CHANGE_EVENT, applyColorScheme, getStoredColorScheme } from "../lib/theme";
import ThemeControls from "./ThemeControls";

/**
 * The accent/radius rows here are ThemeControls, the same component
 * the header's ThemeMenu and the mobile panel use — adjusting them
 * here doesn't just preview a cascade for this page, it persists the
 * same way as changing it from the header would: navigate away, come
 * back, it's still set. That's deliberate, not a side effect — it's
 * "one value, one cascade" made literally true instead of just
 * claimed.
 */
export default function ThemePlayground() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    function sync() {
      setDark(getStoredColorScheme() === "dark");
    }
    sync();
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, sync);
  }, []);

  return (
    <div className="playground">
      <div className="playground-controls">
        <ThemeControls />
        <div>
          <p className="playground-label">Colour scheme</p>
          <Switch
            checked={dark}
            onCheckedChange={(checked) => {
              setDark(checked);
              applyColorScheme(checked ? "dark" : "light");
            }}
          >
            Dark mode
          </Switch>
        </div>
      </div>

      <div className="playground-gallery">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Checkbox defaultChecked>Checkbox</Checkbox>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          style={{ minInlineSize: "14rem" }}
        />
        <span style={{ display: "inline-flex", gap: "var(--kernel-space-2)" }}>
          <Badge variant="accent">Accent</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
        </span>
        <Avatar fallback="KK" />
        <Card style={{ inlineSize: "12rem" }}>
          <CardContent>
            <p style={{ margin: 0, fontSize: "var(--kernel-font-size-sm)", color: "var(--kernel-color-text-muted)" }}>
              Card corners follow the radius above too.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
