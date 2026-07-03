import { useEffect, useState } from "react";
import { Progress } from "@kernelui-lib/react";

export default function ProgressDemo() {
  const [value, setValue] = useState(20);

  useEffect(() => {
    const id = setInterval(() => setValue((v) => (v >= 100 ? 20 : v + 20)), 1200);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", inlineSize: "100%" }}>
      <Progress label="Upload progress" value={value} />
      <Progress label="Working" />
    </div>
  );
}
