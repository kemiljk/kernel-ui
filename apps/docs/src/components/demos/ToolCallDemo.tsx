import { useEffect, useState } from "react";
import { Source, Sources, ToolCall } from "@kernelui-lib/react";

const RESULTS = [
  {
    title: "JWT verification best practices",
    href: "https://auth0.com/blog/jwt-security-best-practices",
  },
  {
    title: "Node.js authentication security guide",
    href: "https://owasp.org/www-project-nodejs-goat",
  },
  {
    title: "JWT attacks · Web Security Academy",
    href: "https://portswigger.net/web-security/jwt",
  },
];

export default function ToolCallDemo() {
  const [status, setStatus] = useState<"running" | "complete">("running");
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setVisible(1), 700),
      window.setTimeout(() => setVisible(2), 1400),
      window.setTimeout(() => setVisible(3), 2100),
      window.setTimeout(() => setStatus("complete"), 2600),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <ToolCall
      label={
        status === "running"
          ? 'Searching "JWT auth vulnerabilities"'
          : 'Searched "JWT auth vulnerabilities"'
      }
      status={status}
      defaultOpen
    >
      <Sources heading={null}>
        {RESULTS.slice(0, visible).map((result, index) => (
          <Source key={result.href} index={index + 1} title={result.title} href={result.href} />
        ))}
      </Sources>
    </ToolCall>
  );
}
