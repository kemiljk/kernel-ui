import { useEffect, useRef, useState } from "react";
import { Button, TodoItem, TodoList, animateTodoListChange } from "@kernelui-lib/react";

const TASKS = [
  "Read the failing test",
  "Trace the assertion to sheetDrag.ts",
  "Fix the settle target",
  "Re-run the motion checks",
];

/** A different order every press, never the one already showing. */
function reprioritise(order: string[]): string[] {
  const next = [...order];
  do {
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j]!, next[i]!];
    }
  } while (next.every((task, index) => task === order[index]));
  return next;
}

/** Walks one task forward every couple of seconds so the marks are seen
 * cross-fading rather than described, and reorders on demand so the move
 * animation can be seen too. */
export default function TodoListDemo() {
  const [done, setDone] = useState(1);
  const [order, setOrder] = useState(TASKS);
  const plan = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDone((current) => (current >= TASKS.length ? 0 : current + 1));
    }, 2000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div style={{ display: "grid", gap: "var(--kernel-space-3)", justifyItems: "start", inlineSize: "min(28rem, 100%)" }}>
      <TodoList
        ref={plan}
        label="Fix the failing motion check"
        metadata="sheetDrag.ts"
        style={{ inlineSize: "100%" }}
      >
        {order.map((task) => {
          // Status follows the task, not its position, so a reorder moves
          // each task with its own progress.
          const index = TASKS.indexOf(task);
          return (
            <TodoItem
              key={task}
              status={index < done ? "done" : index === done ? "active" : "pending"}
              metadata={index < done ? "0.4s" : undefined}
            >
              {task}
            </TodoItem>
          );
        })}
      </TodoList>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => void animateTodoListChange(plan.current, () => setOrder(reprioritise))}
      >
        Reprioritise
      </Button>
    </div>
  );
}
