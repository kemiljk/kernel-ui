import { useState } from "react";
import { InputOTP } from "@kernelui/react";

export default function InputOTPDemo() {
  const [complete, setComplete] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "flex-start" }}>
      <InputOTP
        length={6}
        label="Verification code"
        onValueChange={(value) => setComplete(value.length === 6)}
        onComplete={() => setComplete(true)}
      />
      <p>{complete ? "Complete!" : "Enter the 6-digit code sent to your phone."}</p>
    </div>
  );
}
