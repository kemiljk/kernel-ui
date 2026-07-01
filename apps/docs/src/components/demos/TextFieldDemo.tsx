import { useState } from "react";
import { TextField } from "@kernelui/react";

export default function TextFieldDemo() {
  const [email, setEmail] = useState("not-an-email");

  return (
    <>
      <TextField label="Name" placeholder="Ada Lovelace" autoComplete="name" />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        invalid={!email.includes("@")}
        errorMessage="Enter a valid email address."
        description="We'll only use this to reply."
      />
      <TextField label="Disabled" disabled defaultValue="Can't touch this" />
    </>
  );
}
