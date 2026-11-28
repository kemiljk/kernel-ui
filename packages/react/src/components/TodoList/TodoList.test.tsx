import { act, render, screen } from "@testing-library/react";
import { createRef, type Ref } from "react";
import { describe, expect, it, vi } from "vitest";
import { TodoItem, TodoList, animateTodoListChange } from "./TodoList";

function Plan({ order, listRef }: { order: string[]; listRef?: Ref<HTMLDetailsElement> }) {
  return (
    <TodoList ref={listRef} label="Plan">
      {order.map((task) => (
        <TodoItem key={task}>{task}</TodoItem>
      ))}
    </TodoList>
  );
}

const texts = () => screen.getAllByRole("listitem").map((item) => item.textContent?.replace(/To do$/, ""));

describe("TodoList reorder", () => {
  it("keeps the same <li> nodes and lands on the new order", () => {
    const { rerender } = render(<Plan order={["a", "b", "c"]} />);
    const before = screen.getAllByRole("listitem");
    rerender(<Plan order={["c", "a", "b"]} />);
    const after = screen.getAllByRole("listitem");
    expect(texts()).toEqual(["c", "a", "b"]);
    expect(after[0]).toBe(before[2]);
  });

  it("forwards its ref to the <details>", () => {
    const ref = createRef<HTMLDetailsElement>();
    render(<Plan order={["a"]} listRef={ref} />);
    expect(ref.current?.tagName).toBe("DETAILS");
  });

  it("animateTodoListChange commits the update synchronously when it can't animate", async () => {
    const ref = createRef<HTMLDetailsElement>();
    const update = vi.fn();
    render(<Plan order={["a"]} listRef={ref} />);
    await act(() => animateTodoListChange(ref.current, update));
    expect(update).toHaveBeenCalledTimes(1);
    await animateTodoListChange(null, update);
    expect(update).toHaveBeenCalledTimes(2);
  });
});
