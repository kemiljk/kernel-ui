import { TodoItem, TodoList } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "label", label: "label", default: "Plan" },
  { type: "text" as const, prop: "metadata", label: "metadata", default: "4 steps" },
  { type: "number" as const, prop: "done", label: "tasks done", default: 2, min: 0, max: 4, step: 1 },
  { type: "boolean" as const, prop: "failed", label: "last task failed", default: false },
  { type: "boolean" as const, prop: "defaultOpen", label: "default open", default: true },
];

const TASKS = ["Read the failing test", "Trace the assertion", "Fix the settle target", "Re-run the checks"];

function statusFor(index: number, done: number, failed: boolean) {
  if (failed && index === TASKS.length - 1) return "error" as const;
  if (index < done) return "done" as const;
  if (index === done) return "active" as const;
  return "pending" as const;
}

function code(values: PlaygroundValues) {
  return `<TodoList label="${values.label}" metadata="${values.metadata}" defaultOpen={${values.defaultOpen}}>
${TASKS.map((task, i) => `  <TodoItem status="${statusFor(i, Number(values.done), Boolean(values.failed))}">${task}</TodoItem>`).join("\n")}
</TodoList>`;
}

function elementsCode(values: PlaygroundValues) {
  return `<kernel-todo-list label="${values.label}" metadata="${values.metadata}"${values.defaultOpen ? "" : ' default-open="false"'}>
${TASKS.map((task, i) => `  <kernel-todo-item status="${statusFor(i, Number(values.done), Boolean(values.failed))}">${task}</kernel-todo-item>`).join("\n")}
</kernel-todo-list>`;
}

export default function TodoListPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      stageClassName="prop-playground-stage-start"
      render={(values) => (
        <TodoList
          label={String(values.label)}
          metadata={String(values.metadata)}
          defaultOpen={Boolean(values.defaultOpen)}
          style={{ inlineSize: "min(26rem, 100%)" }}
        >
          {TASKS.map((task, index) => (
            <TodoItem
              key={task}
              status={statusFor(index, Number(values.done), Boolean(values.failed))}
            >
              {task}
            </TodoItem>
          ))}
        </TodoList>
      )}
    />
  );
}
