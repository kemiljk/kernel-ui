import { useState, type FormEvent } from "react";
import { Button, Callout, Checkbox, TextField } from "@kernelui-lib/react";

type Values = { name: string; email: string; password: string; confirm: string; terms: boolean };
type Errors = Partial<Record<keyof Values, string>>;

function validate(v: Values): Errors {
  const errors: Errors = {};
  if (!v.name.trim()) errors.name = "Enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) errors.email = "Enter an email address like name@example.com.";
  if (v.password.length < 8) errors.password = "Use at least 8 characters.";
  if (!v.confirm || v.confirm !== v.password) errors.confirm = "The passwords don't match.";
  if (!v.terms) errors.terms = "You need to agree to the terms to continue.";
  return errors;
}

export default function App() {
  const [values, setValues] = useState<Values>({ name: "", email: "", password: "", confirm: "", terms: false });
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((v) => ({ ...v, [key]: value }));

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = validate(values);
    setErrors(next);
    if (Object.keys(next).length === 0) setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="page">
        <Callout variant="success" title="Account created">
          Welcome, {values.name}. We've sent a confirmation link to {values.email}.
        </Callout>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>Create your account</h1>
      <form className="form" noValidate onSubmit={onSubmit}>
        <TextField label="Full name" autoComplete="name" value={values.name} onChange={(e) => set("name", e.target.value)} invalid={Boolean(errors.name)} errorMessage={errors.name} required />
        <TextField label="Email" type="email" autoComplete="email" value={values.email} onChange={(e) => set("email", e.target.value)} invalid={Boolean(errors.email)} errorMessage={errors.email} required />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          description="At least 8 characters."
          value={values.password}
          onChange={(e) => set("password", e.target.value)}
          invalid={Boolean(errors.password)}
          errorMessage={errors.password}
          required
        />
        <TextField label="Confirm password" type="password" autoComplete="new-password" value={values.confirm} onChange={(e) => set("confirm", e.target.value)} invalid={Boolean(errors.confirm)} errorMessage={errors.confirm} required />
        <div>
          <Checkbox checked={values.terms} onCheckedChange={(checked) => set("terms", checked)} aria-invalid={errors.terms ? true : undefined} aria-describedby={errors.terms ? "terms-error" : undefined}>
            I agree to the terms
          </Checkbox>
          {errors.terms && (
            <p id="terms-error" className="error" role="alert">
              {errors.terms}
            </p>
          )}
        </div>
        <Button type="submit" variant="primary">
          Create account
        </Button>
      </form>
    </main>
  );
}
