import { Button, TextField } from "@kernelui-lib/react";

export default function App() {
  return (
    <main style={{ padding: "2rem", maxWidth: "24rem" }}>
      <h1>Kernel smoke test</h1>
      <p>Consumer app using published @kernelui-lib packages.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <TextField label="Email" type="email" placeholder="you@example.com" />
        <Button variant="primary">Save changes</Button>
      </div>
    </main>
  );
}
