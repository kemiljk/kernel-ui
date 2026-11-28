import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import "../../../../elements/src/components/HoverCard/HoverCard";
import { HoverCard } from "./HoverCard";

/**
 * A card that appears, or animates out, under a pointer that hasn't moved
 * receives boundary events the user never made; Firefox delivers them a
 * frame or more late, so a `pointerenter` can land on the card while it's
 * playing its Escape exit. That must not bring the dismissed card back.
 */
describe("HoverCard Escape dismissal (WCAG 1.4.13)", () => {
  it("React: a pointerenter on the closing card doesn't undo Escape; a real leave and re-enter reopens it", async () => {
    render(<HoverCard content="Card body" openDelay={0} closeDelay={0} render={<a href="#t">Trigger</a>} />);
    const trigger = screen.getByRole("link", { name: "Trigger" });
    const card = document.querySelector<HTMLElement>('[data-slot="hover-card-content"]')!;

    act(() => trigger.focus());
    await waitFor(() => expect(card).toHaveAttribute("data-open"));

    fireEvent.keyDown(document, { key: "Escape" });
    // The late, synthetic enter from a stationary pointer.
    fireEvent.pointerEnter(card, { pointerType: "mouse" });
    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
    await waitFor(() => {
      expect(card).not.toHaveAttribute("data-open");
      expect(card).not.toHaveAttribute("data-closing");
    });
    expect(document.activeElement).toBe(trigger);

    // The pointer really leaves and comes back: hover works again.
    fireEvent.pointerLeave(card, { pointerType: "mouse" });
    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
    await waitFor(() => expect(card).toHaveAttribute("data-open"));
  });

  it("elements: a pointerenter on the closing card doesn't undo Escape; a real leave and re-enter reopens it", async () => {
    const host = document.createElement("kernel-hover-card");
    host.setAttribute("open-delay", "0");
    host.setAttribute("close-delay", "0");
    host.innerHTML = '<a slot="trigger" href="#t">Trigger</a><p>Card body</p>';
    document.body.append(host);
    const trigger = host.querySelector<HTMLElement>('[slot="trigger"]')!;
    const card = host.querySelector<HTMLElement>('[data-slot="hover-card-content"]')!;

    trigger.focus();
    await waitFor(() => expect(card).toHaveAttribute("data-open"));

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.pointerEnter(card, { pointerType: "mouse" });
    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
    await waitFor(() => {
      expect(card).not.toHaveAttribute("data-open");
      expect(card).not.toHaveAttribute("data-closing");
    });

    fireEvent.pointerLeave(card, { pointerType: "mouse" });
    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
    await waitFor(() => expect(card).toHaveAttribute("data-open"));
    host.remove();
  });
});
