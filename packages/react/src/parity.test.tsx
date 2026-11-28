import type { ReactElement } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { computeAccessibleDescription, computeAccessibleName } from "dom-accessibility-api";
import { afterEach, describe, expect, it } from "vitest";
import "../../elements/src/index";
import { Accordion, AccordionItem } from "./components/Accordion/Accordion";
import { ArtifactPanel } from "./components/ArtifactPanel/ArtifactPanel";
import { Badge } from "./components/Badge/Badge";
import { Button } from "./components/Button/Button";
import { Callout } from "./components/Callout/Callout";
import { Checkbox } from "./components/Checkbox/Checkbox";
import { Dialog } from "./components/Dialog/Dialog";
import { Label } from "./components/Label/Label";
import { NumberField } from "./components/NumberField/NumberField";
import { Progress } from "./components/Progress/Progress";
import { SchemaRenderer } from "./components/SchemaRenderer/SchemaRenderer";
import { RadioGroup, RadioGroupItem } from "./components/RadioGroup/RadioGroup";
import { Select, SelectOption } from "./components/Select/Select";
import { Separator } from "./components/Separator/Separator";
import { Skeleton } from "./components/Skeleton/Skeleton";
import { Slider } from "./components/Slider/Slider";
import { Suggestion, SuggestionItem } from "./components/Suggestion/Suggestion";
import { Switch } from "./components/Switch/Switch";
import { Tab, TabPanel, Tabs, TabsList } from "./components/Tabs/Tabs";
import { TagInput } from "./components/TagInput/TagInput";
import { Textarea } from "./components/Textarea/Textarea";
import { TextField } from "./components/TextField/TextField";
import { Toggle } from "./components/Toggle/Toggle";
import { Tooltip } from "./components/Tooltip/Tooltip";

/*
 * DOM parity between @kernelui-lib/react and @kernelui-lib/elements.
 *
 * Both packages promise the same component: the same native element, the
 * same `kernel-<Name>-<part>` classes (one stylesheet serves both), the same
 * `data-*` state hooks and the same accessibility tree. Each case renders the
 * React component and the Custom Element with equivalent props/attributes,
 * then compares a normalised description of every Kernel-classed node.
 *
 * What's normalised away: generated ids (an `aria-labelledby` is compared by
 * the name it produces, not its id), inline styles, and the custom element
 * hosts themselves (they're wrappers React has no equivalent of).
 */

interface Case {
  name: string;
  react: () => ReactElement;
  element: string;
  /** Extra attributes to compare beyond the defaults below. */
  attrs?: string[];
  /** An interaction run against both renders, compared again afterwards. */
  interact?: (root: HTMLElement) => void;
}

/** One tree touching every SchemaRenderer node type, including a dropped
 * unknown type and an unsafe URL, rendered by both packages. */
const schemaTree = {
  version: 1,
  root: [
    { type: "Heading", props: { text: "Your trip", level: 2 } },
    {
      type: "Stack",
      props: { direction: "horizontal", gap: "sm", wrap: true },
      children: [
        { type: "Badge", props: { text: "Confirmed", variant: "success" } },
        { type: "Badge", props: { text: "2 guests" } },
      ],
    },
    {
      type: "Card",
      props: { title: "Lisbon", description: "3 nights" },
      children: [
        { type: "Text", props: { text: "Check-in from 3pm. ", tone: "muted" }, children: [{ type: "Link", props: { href: "https://example.com/map", text: "Map", external: true } }] },
        { type: "Image", props: { src: "/hotel.jpg", alt: "Hotel lobby", width: 320, height: 180 } },
        { type: "Progress", props: { label: "Trip planned", value: 60 } },
      ],
    },
    {
      type: "Table",
      props: { caption: "Flights", columns: [{ key: "leg", label: "Leg" }, { key: "time", label: "Time" }], rows: [{ leg: "LHR → LIS", time: "08:10" }, { leg: "LIS → LHR", time: null }] },
    },
    { type: "Callout", props: { variant: "warning", title: "Passport", text: "Valid for 6 months." } },
    { type: "Separator" },
    {
      type: "Form",
      props: { action: "save" },
      children: [
        { type: "TextField", props: { name: "name", label: "Full name", defaultValue: "Ada", required: true } },
        { type: "Select", props: { name: "seat", label: "Seat", options: ["Aisle", "Window"], defaultValue: "Window" } },
        { type: "Checkbox", props: { name: "bag", label: "Checked bag", defaultChecked: true } },
        { type: "Switch", props: { name: "sms", label: "Text me updates" } },
        { type: "Button", props: { label: "Save", variant: "primary", submit: true } },
      ],
    },
    { type: "Button", props: { label: "Cancel trip", variant: "danger", action: "cancel" } },
    { type: "Link", props: { href: "javascript:alert(1)", text: "Unsafe" } },
    { type: "Marquee", props: { text: "dropped" } },
  ],
};

const click = (selector: string) => (root: HTMLElement) => {
  const target = root.querySelectorAll<HTMLElement>(selector);
  if (!target.length) throw new Error(`parity: nothing matches ${selector}`);
  fireEvent.click(target[target.length - 1]!);
};

const cases: Case[] = [
  {
    name: "Button",
    react: () => <Button variant="primary">Save</Button>,
    element: `<kernel-button variant="primary">Save</kernel-button>`,
  },
  {
    name: "Button (disabled, small)",
    react: () => (
      <Button size="sm" disabled>
        Delete
      </Button>
    ),
    element: `<kernel-button size="sm" disabled>Delete</kernel-button>`,
  },
  {
    name: "Button (loading)",
    react: () => <Button loading>Saving</Button>,
    element: `<kernel-button loading>Saving</kernel-button>`,
  },
  {
    name: "Badge",
    react: () => <Badge variant="success">Live</Badge>,
    element: `<kernel-badge variant="success">Live</kernel-badge>`,
  },
  {
    name: "Checkbox",
    react: () => <Checkbox defaultChecked>Accept terms</Checkbox>,
    element: `<kernel-checkbox checked>Accept terms</kernel-checkbox>`,
    interact: click('input[type="checkbox"]'),
  },
  {
    name: "Checkbox (disabled)",
    react: () => <Checkbox disabled>Accept terms</Checkbox>,
    element: `<kernel-checkbox disabled>Accept terms</kernel-checkbox>`,
  },
  {
    name: "Switch",
    react: () => <Switch defaultChecked>Wi-Fi</Switch>,
    element: `<kernel-switch checked>Wi-Fi</kernel-switch>`,
    interact: click('[role="switch"]'),
  },
  {
    name: "Switch (disabled)",
    react: () => <Switch disabled>Wi-Fi</Switch>,
    element: `<kernel-switch disabled>Wi-Fi</kernel-switch>`,
  },
  {
    name: "TextField",
    react: () => <TextField label="Email" description="We never share it." placeholder="you@example.com" />,
    element: `<kernel-text-field label="Email" description="We never share it." placeholder="you@example.com"></kernel-text-field>`,
  },
  {
    name: "TextField (invalid)",
    react: () => <TextField label="Email" invalid errorMessage="Enter an email." />,
    element: `<kernel-text-field label="Email" invalid error-message="Enter an email."></kernel-text-field>`,
  },
  {
    name: "Textarea",
    react: () => <Textarea label="Bio" hideLabel />,
    element: `<kernel-textarea label="Bio" hide-label></kernel-textarea>`,
  },
  {
    name: "Select",
    react: () => (
      <Select label="Country" defaultValue="uk">
        <SelectOption value="us">United States</SelectOption>
        <SelectOption value="uk">United Kingdom</SelectOption>
      </Select>
    ),
    element: `<kernel-select label="Country" value="uk"><option value="us">United States</option><option value="uk">United Kingdom</option></kernel-select>`,
  },
  {
    name: "NumberField",
    react: () => <NumberField label="Quantity" defaultValue={2} min={0} max={10} />,
    element: `<kernel-number-field label="Quantity" value="2" min="0" max="10"></kernel-number-field>`,
  },
  {
    name: "Dialog",
    react: () => (
      <Dialog open onOpenChange={() => {}} title="Settings" description="Manage your account.">
        Body
      </Dialog>
    ),
    element: `<kernel-dialog open title="Settings" description="Manage your account.">Body</kernel-dialog>`,
  },
  {
    name: "Tabs",
    react: () => (
      <Tabs defaultValue="a">
        <TabsList aria-label="Sections">
          <Tab value="a">Account</Tab>
          <Tab value="b">Billing</Tab>
        </TabsList>
        <TabPanel value="a">Account panel</TabPanel>
        <TabPanel value="b">Billing panel</TabPanel>
      </Tabs>
    ),
    interact: click('[role="tab"]'),
    element: `<kernel-tabs default-value="a"><kernel-tabs-list aria-label="Sections"><kernel-tab value="a">Account</kernel-tab><kernel-tab value="b">Billing</kernel-tab></kernel-tabs-list><kernel-tab-panel value="a">Account panel</kernel-tab-panel><kernel-tab-panel value="b">Billing panel</kernel-tab-panel></kernel-tabs>`,
  },
  {
    name: "Accordion",
    react: () => (
      <Accordion>
        <AccordionItem title="Shipping" defaultOpen>
          Ships in 2 days.
        </AccordionItem>
        <AccordionItem title="Returns">30 days.</AccordionItem>
      </Accordion>
    ),
    element: `<kernel-accordion><kernel-accordion-item title="Shipping" default-open>Ships in 2 days.</kernel-accordion-item><kernel-accordion-item title="Returns">30 days.</kernel-accordion-item></kernel-accordion>`,
  },
  {
    name: "Tooltip",
    react: () => <Tooltip content="Copy to clipboard" render={<button type="button">Copy</button>} />,
    element: `<kernel-tooltip><button type="button" slot="trigger">Copy</button>Copy to clipboard</kernel-tooltip>`,
  },
  {
    name: "Progress",
    react: () => <Progress label="Uploading" value={40} max={100} />,
    element: `<kernel-progress label="Uploading" value="40" max="100"></kernel-progress>`,
  },
  {
    name: "Suggestion",
    react: () => (
      <Suggestion>
        <SuggestionItem>Summarise this</SuggestionItem>
        <SuggestionItem value="tr">Translate</SuggestionItem>
      </Suggestion>
    ),
    element: `<kernel-suggestion><kernel-suggestion-item>Summarise this</kernel-suggestion-item><kernel-suggestion-item value="tr">Translate</kernel-suggestion-item></kernel-suggestion>`,
  },
  {
    name: "Suggestion (disabled, labelled)",
    react: () => (
      <Suggestion label="Try asking" disabled>
        <SuggestionItem>Summarise this</SuggestionItem>
      </Suggestion>
    ),
    element: `<kernel-suggestion label="Try asking" disabled><kernel-suggestion-item>Summarise this</kernel-suggestion-item></kernel-suggestion>`,
  },
  {
    name: "TagInput",
    react: () => <TagInput label="Tags" defaultValue={["design", "a11y"]} />,
    element: `<kernel-tag-input label="Tags" value="design,a11y"></kernel-tag-input>`,
  },
  {
    name: "Toggle",
    react: () => (
      <Toggle defaultPressed aria-label="Bold">
        B
      </Toggle>
    ),
    element: `<kernel-toggle pressed aria-label="Bold">B</kernel-toggle>`,
    interact: click("button"),
  },
  {
    name: "Toggle (small, disabled)",
    react: () => (
      <Toggle size="sm" disabled>
        Italic
      </Toggle>
    ),
    element: `<kernel-toggle size="sm" disabled>Italic</kernel-toggle>`,
  },
  {
    name: "Separator",
    react: () => <Separator />,
    element: `<kernel-separator></kernel-separator>`,
  },
  {
    name: "Separator (vertical)",
    react: () => <Separator orientation="vertical" />,
    element: `<kernel-separator orientation="vertical"></kernel-separator>`,
  },
  {
    name: "RadioGroup",
    react: () => (
      <RadioGroup label="Plan" name="plan" defaultValue="pro">
        <RadioGroupItem value="free">Free</RadioGroupItem>
        <RadioGroupItem value="pro">Pro</RadioGroupItem>
      </RadioGroup>
    ),
    element: `<kernel-radio-group label="Plan" name="plan" value="pro"><kernel-radio-group-item value="free">Free</kernel-radio-group-item><kernel-radio-group-item value="pro">Pro</kernel-radio-group-item></kernel-radio-group>`,
    interact: (root) => fireEvent.click(root.querySelector<HTMLElement>('input[value="free"]')!),
  },
  {
    name: "Slider",
    react: () => <Slider label="Volume" defaultValue={30} />,
    element: `<kernel-slider label="Volume" value="30"></kernel-slider>`,
  },
  {
    name: "Callout",
    react: () => (
      <Callout variant="warning" title="Heads up">
        Read this first.
      </Callout>
    ),
    element: `<kernel-callout variant="warning"><span slot="title">Heads up</span>Read this first.</kernel-callout>`,
  },
  {
    name: "Label",
    react: () => <Label required>Name</Label>,
    element: `<kernel-label required>Name</kernel-label>`,
  },
  {
    name: "Skeleton",
    react: () => <Skeleton />,
    element: `<kernel-skeleton></kernel-skeleton>`,
  },
  {
    name: "SchemaRenderer",
    react: () => <SchemaRenderer value={schemaTree} onIssue={() => {}} />,
    element: `<kernel-schema-renderer value='${JSON.stringify(schemaTree).replace(/'/g, "&#39;")}'></kernel-schema-renderer>`,
    attrs: ["href", "target", "rel", "src", "alt", "width", "height", "loading", "scope", "name", "data-level"],
    interact: click('button[role="switch"]'),
  },
  {
    name: "ArtifactPanel (docked, views, versions, streaming)",
    react: () => (
      <ArtifactPanel
        title="Landing page"
        presentation="docked"
        status="streaming"
        version={2}
        versionCount={3}
        views={[
          { value: "preview", label: "Preview", content: "Rendered" },
          { value: "code", label: "Code", content: "Source" },
        ]}
      />
    ),
    element: `<kernel-artifact-panel title="Landing page" open presentation="docked" status="streaming" version="2" version-count="3"><kernel-artifact-view value="preview" label="Preview">Rendered</kernel-artifact-view><kernel-artifact-view value="code" label="Code">Source</kernel-artifact-view></kernel-artifact-panel>`,
    interact: click('[role="tab"]'),
  },
  {
    name: "ArtifactPanel (body, error)",
    react: () => (
      <ArtifactPanel title="Report" presentation="docked" status="error">
        Body
      </ArtifactPanel>
    ),
    element: `<kernel-artifact-panel title="Report" open presentation="docked" status="error">Body</kernel-artifact-panel>`,
  },
];

/** Attributes that carry an id: compared by presence, never by value. */
const ID_REFS = new Set([
  "id",
  "for",
  "name",
  "aria-labelledby",
  "aria-describedby",
  "aria-controls",
  "aria-errormessage",
  "aria-owns",
  "aria-activedescendant",
  "popovertarget",
  "interestfor",
  "anchor",
]);

/** Non-data, non-aria attributes that encode native state worth comparing. */
const NATIVE_STATE = [
  "role",
  "type",
  "disabled",
  "checked",
  "hidden",
  "open",
  "required",
  "readonly",
  "popover",
  "tabindex",
  "value",
  "min",
  "max",
  "step",
  "placeholder",
  "inert",
];

const INTERACTIVE = /^(button|input|select|textarea|a|summary|dialog|progress|meter|fieldset|nav|ul|ol|li|hr|label)$/;

function describeNode(el: Element, extra: string[]) {
  const attrs: Record<string, string> = {};
  for (const { name, value } of Array.from(el.attributes)) {
    if (name === "class" || name === "style") continue;
    const keep =
      name.startsWith("data-") || name.startsWith("aria-") || NATIVE_STATE.includes(name) || extra.includes(name) || ID_REFS.has(name);
    if (!keep) continue;
    attrs[name] = ID_REFS.has(name) ? "<ref>" : value;
  }
  // Live state that React sets as a DOM property rather than an attribute.
  if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
    attrs[":checked"] = String(el.checked);
    attrs[":indeterminate"] = String(el.indeterminate);
    delete attrs.checked;
  }
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    attrs[":value"] = el.value;
    delete attrs.value;
  }
  const classes = Array.from(el.classList)
    .filter((c) => c.startsWith("kernel-"))
    .sort();
  const node: Record<string, unknown> = { tag: el.tagName.toLowerCase(), classes, attrs };
  if (el.hasAttribute("role") || INTERACTIVE.test(node.tag as string)) {
    node.name = computeAccessibleName(el);
    const description = computeAccessibleDescription(el);
    if (description) node.description = description;
  }
  return node;
}

function snapshot(root: Element, extra: string[] = []) {
  return Array.from(root.querySelectorAll("*"))
    .filter((el) => Array.from(el.classList).some((c) => c.startsWith("kernel-")) && !el.tagName.includes("-"))
    .map((el) => describeNode(el, extra));
}

async function flush() {
  // Custom elements defer some rendering to a microtask; both packages flip
  // entrance state (`data-opening` → `data-open`) a frame later. Compare the
  // settled DOM, not whichever frame each happened to be on.
  await act(async () => {
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 50));
  });
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("DOM parity: @kernelui-lib/react ↔ @kernelui-lib/elements", () => {
  it.each(cases)("$name", async ({ react, element, attrs = [], interact }) => {
    render(react());
    await flush();
    const fromReact = snapshot(document.body, attrs);
    let fromReactAfter: unknown[] = [];
    if (interact) {
      act(() => interact(document.body));
      await flush();
      fromReactAfter = snapshot(document.body, attrs);
    }
    cleanup();
    document.body.innerHTML = "";

    const host = document.createElement("div");
    document.body.append(host);
    host.innerHTML = element;
    await flush();
    const fromElements = snapshot(document.body, attrs);

    expect(fromReact.length).toBeGreaterThan(0);
    expect(fromElements).toEqual(fromReact);

    if (interact) {
      interact(document.body);
      await flush();
      expect(fromReactAfter).not.toEqual(fromReact);
      expect(snapshot(document.body, attrs)).toEqual(fromReactAfter);
    }
  });
});
