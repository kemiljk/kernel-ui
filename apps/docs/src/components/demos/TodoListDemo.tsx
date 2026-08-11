import { useEffect, useState } from "react";
import { TodoItem, TodoList } from "@kernelui-lib/react";

const TASKS = [
  "Read the failing test",
  "Trace the assertion to sheetDrag.ts",
  "Fix the settle target",
  "Re-run the motion checks",
];

/** Walks one task forward every couple of seconds so the marks are seen
 * cross-fading rather than described. */
export default function TodoListDemo() {
  const [done, setDone] = useState(1);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDone((current) => (current >= TASKS.length ? 0 : current + 1));
    }, 2000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <TodoList label="Fix the failing motion check" metadata="sheetDrag.ts" style={{ inlineSize: "min(28rem, 100%)" }}>
      {TASKS.map((task, index) => (
        <TodoItem
          key={task}
          status={index < done ? "done" : index === done ? "active" : "pending"}
          metadata={index < done ? "0.4s" : undefined}
        >
          {task}
        </TodoItem>
      ))}
    </TodoList>
  );
}
