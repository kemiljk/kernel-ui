import { useState } from "react";
import { Button } from "@kernelui/react";
import { CheckIcon, CopyIcon, MagnifyingGlassIcon } from "../icons";

export default function ButtonDemo() {
  const [loading, setLoading] = useState(false);

  return (
    <>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button
        variant="primary"
        loading={loading}
        onClick={() => {
          setLoading(true);
          setTimeout(() => setLoading(false), 1500);
        }}
      >
        {loading ? "Saving" : "Click to load"}
      </Button>
      <Button disabled>Disabled</Button>
      <Button render={<a href="#rendered-as-link" />}>Rendered as a link</Button>
      <Button variant="secondary" iconStart={<MagnifyingGlassIcon />}>
        Search
      </Button>
      <Button variant="primary" iconEnd={<CheckIcon />}>
        Mark as done
      </Button>
      <Button variant="ghost" aria-label="Copy" iconStart={<CopyIcon />} />
    </>
  );
}
