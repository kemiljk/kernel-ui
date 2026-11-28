import { Button, EmptyState } from "@kernelui-lib/react";

export function InboxIcon() {
  return (
    <svg viewBox="0 0 16 16" width="20" height="20" fill="none" aria-hidden="true">
      <path
        d="M2 9.25h3.25l1 1.5h3.5l1-1.5H14M2 9.25 3.6 3.6a1 1 0 0 1 .96-.73h6.88a1 1 0 0 1 .96.73L14 9.25M2 9.25V12.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.25"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function EmptyStateDemo() {
  return (
    <EmptyState
      style={{ inlineSize: "min(100%, 28rem)" }}
      icon={<InboxIcon />}
      title="No conversations yet"
      description="Start a chat and it will show up here, with its files and tool runs."
      actions={
        <>
          <Button variant="primary">New chat</Button>
          <Button variant="ghost">Import history</Button>
        </>
      }
    />
  );
}
