import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { Message, MessageBubble, MessageList } from "./Message";

/** jsdom has no layout, so the bubble's height is faked. The observer is
 * stubbed to fire once on `observe`, which is what a real ResizeObserver does
 * on its first delivery. */
function stubLayout(clientHeight: number) {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private readonly callback: () => void) {}
      observe() {
        this.callback();
      }
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(clientHeight);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderBubble(children: string, props: Record<string, unknown> = {}) {
  const { container } = render(
    <MessageList>
      <Message author="user">
        {/* Inline padding/line-height so jsdom's computed style has real numbers
            for the measurement to work from. */}
        <MessageBubble style={{ lineHeight: "24px", paddingTop: "8px", paddingBottom: "8px" }} {...props}>
          {children}
        </MessageBubble>
      </Message>
    </MessageList>,
  );
  return container.querySelector<HTMLElement>("[data-tone]")!;
}

describe("Message", () => {
  it("renders the transcript as a real ordered list of articles", () => {
    stubLayout(40);
    const { container } = render(
      <MessageList>
        <Message author="user" name="You">
          <MessageBubble>Hi</MessageBubble>
        </Message>
        <Message author="assistant" name="Assistant">
          <MessageBubble>Hello</MessageBubble>
        </Message>
      </MessageList>,
    );
    expect(container.querySelector("ol")).toBeInTheDocument();
    expect(container.querySelectorAll("ol > li")).toHaveLength(2);
    expect(container.querySelectorAll("li > article")).toHaveLength(2);
    // The author is announced through the article's label, which is why the
    // avatar is aria-hidden rather than read out twice.
    expect(container.querySelector("article")).toHaveAttribute("aria-label", "You");
  });

  it("marks a one-line bubble single so CSS can round it as a pill", () => {
    stubLayout(40); // 24px of content in a 24px line box
    expect(renderBubble("Short")).toHaveAttribute("data-lines", "single");
  });

  it("marks a wrapped bubble multi so it gets the large corner instead", () => {
    stubLayout(112); // ~4 lines
    expect(renderBubble("A much longer message that wraps")).toHaveAttribute("data-lines", "multi");
  });

  it("leaves an expandable bubble unmeasured — its height is the disclosure's, not the text's", () => {
    stubLayout(40);
    const bubble = renderBubble("Collapsed", { expandable: true });
    expect(bubble.tagName).toBe("DETAILS");
    expect(bubble).not.toHaveAttribute("data-lines");
  });

  it("drops the repeated header on a grouped row but keeps the avatar's column", () => {
    stubLayout(40);
    const { container } = render(
      <MessageList>
        <Message author="assistant" name="Assistant" avatar="A">
          <MessageBubble>First</MessageBubble>
        </Message>
        <Message author="assistant" avatar="A" grouped>
          <MessageBubble>Second</MessageBubble>
        </Message>
      </MessageList>,
    );
    const rows = container.querySelectorAll("li");
    expect(rows[0]!.querySelector("header")).toBeInTheDocument();
    expect(rows[1]!.querySelector("header")).toBeNull();
    // The box stays (so the run keeps one text column); only its contents go.
    const avatar = rows[1]!.querySelector("[data-hidden]");
    expect(avatar).toBeInTheDocument();
    expect(avatar).toBeEmptyDOMElement();
  });
});
