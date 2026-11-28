import type { ReactElement } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import "../../elements/src/index";
import { accessibleName, checkComponent, checkPage, formatResult, type CheckResult } from "../../testing/src/index";
import { Accordion, AccordionItem } from "./components/Accordion/Accordion";
import { Button } from "./components/Button/Button";
import { Checkbox } from "./components/Checkbox/Checkbox";
import { ColorPicker } from "./components/ColorPicker/ColorPicker";
import { Combobox } from "./components/Combobox/Combobox";
import { ContextMenu } from "./components/ContextMenu/ContextMenu";
import { DatePicker } from "./components/DatePicker/DatePicker";
import { DateRangePicker } from "./components/DateRangePicker/DateRangePicker";
import { Dialog } from "./components/Dialog/Dialog";
import { HoverCard } from "./components/HoverCard/HoverCard";
import { DropdownMenu, MenuItem, MenuSeparator } from "./components/DropdownMenu/DropdownMenu";
import { NumberField } from "./components/NumberField/NumberField";
import { Popover } from "./components/Popover/Popover";
import { RadioGroup, RadioGroupItem } from "./components/RadioGroup/RadioGroup";
import { Select, SelectOption } from "./components/Select/Select";
import { Slider } from "./components/Slider/Slider";
import { Switch } from "./components/Switch/Switch";
import { Tab, TabPanel, Tabs, TabsList } from "./components/Tabs/Tabs";
import { TagInput } from "./components/TagInput/TagInput";
import { Textarea } from "./components/Textarea/Textarea";
import { TextField } from "./components/TextField/TextField";
import { Toggle } from "./components/Toggle/Toggle";
import { Tooltip } from "./components/Tooltip/Tooltip";

/*
 * Kernel's components checked with @kernelui-lib/testing — the same checks
 * consumers run — in both packages. The React render and the custom element
 * must both pass, and must pass the same rules: a rule that passes in one and
 * fails (or is skipped) in the other is a parity bug.
 */

interface Case {
  name: string;
  react: () => ReactElement;
  element: string;
}

const cases: Case[] = [
  {
    name: "Switch",
    react: () => <Switch>Wi-Fi</Switch>,
    element: `<kernel-switch>Wi-Fi</kernel-switch>`,
  },
  {
    name: "Checkbox",
    react: () => <Checkbox>Accept terms</Checkbox>,
    element: `<kernel-checkbox>Accept terms</kernel-checkbox>`,
  },
  {
    name: "Toggle",
    react: () => <Toggle aria-label="Bold">B</Toggle>,
    element: `<kernel-toggle aria-label="Bold">B</kernel-toggle>`,
  },
  {
    name: "Button",
    react: () => <Button>Save</Button>,
    element: `<kernel-button>Save</kernel-button>`,
  },
  {
    name: "TextField",
    react: () => <TextField label="Email" hideLabel />,
    element: `<kernel-text-field label="Email" hide-label></kernel-text-field>`,
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
    name: "Slider",
    react: () => <Slider label="Volume" defaultValue={30} />,
    element: `<kernel-slider label="Volume" value="30"></kernel-slider>`,
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
  },
  {
    name: "Tabs",
    react: () => (
      <Tabs defaultValue="a">
        <TabsList aria-label="Sections">
          <Tab value="a">Account</Tab>
          <Tab value="b">Billing</Tab>
          <Tab value="c">Team</Tab>
        </TabsList>
        <TabPanel value="a">Account panel</TabPanel>
        <TabPanel value="b">Billing panel</TabPanel>
        <TabPanel value="c">Team panel</TabPanel>
      </Tabs>
    ),
    element: `<kernel-tabs default-value="a"><kernel-tabs-list aria-label="Sections"><kernel-tab value="a">Account</kernel-tab><kernel-tab value="b">Billing</kernel-tab><kernel-tab value="c">Team</kernel-tab></kernel-tabs-list><kernel-tab-panel value="a">Account panel</kernel-tab-panel><kernel-tab-panel value="b">Billing panel</kernel-tab-panel><kernel-tab-panel value="c">Team panel</kernel-tab-panel></kernel-tabs>`,
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
    name: "Dialog",
    react: () => (
      <Dialog open onOpenChange={() => {}} title="Settings" description="Manage your account.">
        Body
      </Dialog>
    ),
    element: `<kernel-dialog open title="Settings" description="Manage your account.">Body</kernel-dialog>`,
  },
  {
    name: "DropdownMenu",
    react: () => (
      <DropdownMenu render={<button type="button">Actions</button>}>
        <MenuItem onSelect={() => {}}>Edit</MenuItem>
        <MenuItem onSelect={() => {}}>Duplicate</MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={() => {}}>Delete</MenuItem>
      </DropdownMenu>
    ),
    element: `<kernel-dropdown-menu><button type="button" slot="trigger">Actions</button><kernel-menu-item>Edit</kernel-menu-item><kernel-menu-item>Duplicate</kernel-menu-item><kernel-menu-separator></kernel-menu-separator><kernel-menu-item>Delete</kernel-menu-item></kernel-dropdown-menu>`,
  },
  {
    name: "ContextMenu",
    react: () => (
      <ContextMenu render={<div>Right-click here</div>}>
        <MenuItem onSelect={() => {}}>Copy</MenuItem>
        <MenuItem onSelect={() => {}}>Rename</MenuItem>
      </ContextMenu>
    ),
    element: `<kernel-context-menu><div slot="trigger">Right-click here</div><kernel-menu-item>Copy</kernel-menu-item><kernel-menu-item>Rename</kernel-menu-item></kernel-context-menu>`,
  },
  {
    name: "Combobox",
    react: () => (
      <Combobox
        label="Framework"
        options={[
          { value: "astro", label: "Astro" },
          { value: "next", label: "Next.js" },
          { value: "remix", label: "Remix" },
        ]}
      />
    ),
    element: `<kernel-combobox label="Framework"><option value="astro">Astro</option><option value="next">Next.js</option><option value="remix">Remix</option></kernel-combobox>`,
  },
  {
    name: "Popover",
    react: () => (
      <Popover render={<button type="button">Filters</button>}>
        <p>Content</p>
      </Popover>
    ),
    element: `<kernel-popover><button type="button" slot="trigger">Filters</button><p>Content</p></kernel-popover>`,
  },
  {
    name: "Tooltip",
    react: () => <Tooltip content="Copy to clipboard" openDelay={0} render={<button type="button">Copy</button>} />,
    element: `<kernel-tooltip open-delay="0"><button type="button" slot="trigger">Copy</button>Copy to clipboard</kernel-tooltip>`,
  },
  {
    // A link inside the card: focus moving into it must keep the card open,
    // and Escape from there must hand focus back to the trigger.
    name: "HoverCard",
    react: () => (
      <HoverCard
        render={<a href="#ada">@ada</a>}
        content={
          <>
            <p>Ada Lovelace</p>
            <a href="#ada-posts">Posts</a>
          </>
        }
      />
    ),
    element: `<kernel-hover-card><a slot="trigger" href="#ada">@ada</a><p>Ada Lovelace</p><a href="#ada-posts">Posts</a></kernel-hover-card>`,
  },
  {
    // January 2026 starts on a Thursday, so a week's first day isn't a
    // multiple of seven days from the 1st — the case Home/End used to get wrong.
    name: "DatePicker",
    react: () => <DatePicker defaultValue={new Date(2026, 0, 15)} />,
    element: `<kernel-date-picker value="2026-01-15"></kernel-date-picker>`,
  },
  {
    name: "DateRangePicker",
    react: () => <DateRangePicker defaultValue={{ from: new Date(2026, 0, 12), to: new Date(2026, 0, 15) }} />,
    element: `<kernel-date-range-picker value-from="2026-01-12" value-to="2026-01-15"></kernel-date-range-picker>`,
  },
];

const options = { act: (callback: () => Promise<void>) => act(callback) };
const fieldProps = { label: "Email", description: "We never share it.", invalid: true, errorMessage: "Enter an email." };

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

const summary = (result: CheckResult) => ({
  errors: result.issues.filter((issue) => issue.severity === "error").map((issue) => `${issue.rule}: ${issue.message}`),
  passes: [...new Set(result.passes)].sort(),
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("@kernelui-lib/testing on Kernel's own components", () => {
  it.each(cases)("$name passes in both packages, with the same rules", async ({ name, react, element }) => {
    render(react());
    await flush();
    const fromReact = await checkComponent(document.body, name, options);
    cleanup();
    document.body.innerHTML = "";

    const host = document.createElement("div");
    document.body.append(host);
    host.innerHTML = element;
    await flush();
    const fromElements = await checkComponent(host, name, options);

    expect(summary(fromReact).errors, formatResult(fromReact)).toEqual([]);
    expect(summary(fromElements).errors, formatResult(fromElements)).toEqual([]);
    expect(fromReact.passes.length).toBeGreaterThan(0);
    expect(summary(fromElements).passes).toEqual(summary(fromReact).passes);
  });

  // A field showing its error replaces the description with it; its
  // aria-describedby must not keep pointing at the description's id.
  it.each([
    { name: "TextField", react: () => <TextField {...fieldProps} />, tag: "kernel-text-field" },
    { name: "Textarea", react: () => <Textarea {...fieldProps} />, tag: "kernel-textarea" },
    { name: "NumberField", react: () => <NumberField {...fieldProps} />, tag: "kernel-number-field" },
    { name: "Select", react: () => <Select {...fieldProps}><SelectOption value="a">A</SelectOption></Select>, tag: "kernel-select", children: `<option value="a">A</option>` },
    { name: "TagInput", react: () => <TagInput {...fieldProps} />, tag: "kernel-tag-input" },
    { name: "ColorPicker", react: () => <ColorPicker {...fieldProps} />, tag: "kernel-color-picker" },
  ])("$name with an error and a description has no dangling references", async ({ name, react, tag, children = "" }) => {
    render(react());
    await flush();
    const fromReact = await checkComponent(document.body, name, { ...options, interactions: false });
    cleanup();
    document.body.innerHTML = "";
    document.body.innerHTML = `<${tag} label="Email" description="We never share it." invalid error-message="Enter an email.">${children}</${tag}>`;
    await flush();
    const fromElements = await checkComponent(document.body, name, { interactions: false });
    expect(summary(fromReact).errors, formatResult(fromReact)).toEqual([]);
    expect(summary(fromElements).errors, formatResult(fromElements)).toEqual([]);
  });

  // React-only API (the custom element has no compound form). Its input used
  // to miss the id its <label htmlFor> points at, and hard-coded
  // aria-expanded="true".
  it("compound Combobox (Combobox.Input + Combobox.List) passes", async () => {
    render(
      <Combobox label="Framework">
        <Combobox.Input placeholder="Search frameworks" />
        <Combobox.List>
          <Combobox.Item value="astro">Astro</Combobox.Item>
          <Combobox.Item value="next">Next.js</Combobox.Item>
        </Combobox.List>
      </Combobox>,
    );
    await flush();
    const result = await checkComponent(document.body, "Combobox", options);
    expect(summary(result).errors, formatResult(result)).toEqual([]);
    expect(result.passes).toEqual(expect.arrayContaining(["combobox/name", "combobox/escape-closes", "kernel/label-in-dom"]));
  });

  it("checkPage finds and checks every Kernel component in a composed UI", async () => {
    render(
      <form>
        <TextField label="Name" />
        <Switch>Notifications</Switch>
        <Tabs defaultValue="a">
          <TabsList aria-label="Sections">
            <Tab value="a">Account</Tab>
            <Tab value="b">Billing</Tab>
          </TabsList>
          <TabPanel value="a">Account</TabPanel>
          <TabPanel value="b">Billing</TabPanel>
        </Tabs>
        <Button type="submit">Save</Button>
      </form>,
    );
    await flush();
    const result = await checkPage(document.body, options);
    expect(result.found).toMatchObject({ TextField: 1, Switch: 1, Tabs: 1, Button: 1 });
    expect(summary(result).errors, formatResult(result)).toEqual([]);
  });

  // role="menu" needs a name: DropdownMenu takes its trigger's, ContextMenu
  // (whose right-click area is arbitrary content) takes `label`, falling
  // back to the built-in "Context menu".
  it("names every menu, in both packages", async () => {
    render(
      <>
        <DropdownMenu render={<button type="button">Actions</button>}>
          <MenuItem onSelect={() => {}}>Edit</MenuItem>
        </DropdownMenu>
        <DropdownMenu presentation="disclosure" render={<summary>More</summary>}>
          <MenuItem onSelect={() => {}}>Share</MenuItem>
        </DropdownMenu>
        <ContextMenu render={<div>Row</div>}>
          <MenuItem onSelect={() => {}}>Copy</MenuItem>
        </ContextMenu>
        <ContextMenu render={<div>Row</div>} label="File actions">
          <MenuItem onSelect={() => {}}>Copy</MenuItem>
        </ContextMenu>
        <ContextMenu render={<div>Row</div>} labels={{ menu: "Kontextmenü" }}>
          <MenuItem onSelect={() => {}}>Kopieren</MenuItem>
        </ContextMenu>
      </>,
    );
    await flush();
    const names = () => Array.from(document.querySelectorAll("[role=menu]")).map((menu) => accessibleName(menu));
    expect(names()).toEqual(["Actions", "More", "Context menu", "File actions", "Kontextmenü"]);
    cleanup();

    document.body.innerHTML = `
      <kernel-dropdown-menu><button type="button" slot="trigger">Actions</button><kernel-menu-item>Edit</kernel-menu-item></kernel-dropdown-menu>
      <kernel-dropdown-menu presentation="disclosure"><summary slot="trigger">More</summary><kernel-menu-item>Share</kernel-menu-item></kernel-dropdown-menu>
      <kernel-dropdown-menu-morph><button type="button" slot="trigger">Add</button><kernel-menu-item>File</kernel-menu-item></kernel-dropdown-menu-morph>
      <kernel-context-menu><div slot="trigger">Row</div><kernel-menu-item>Copy</kernel-menu-item></kernel-context-menu>
      <kernel-context-menu label="File actions"><div slot="trigger">Row</div><kernel-menu-item>Copy</kernel-menu-item></kernel-context-menu>
      <kernel-context-menu label-menu="Kontextmenü"><div slot="trigger">Row</div><kernel-menu-item>Kopieren</kernel-menu-item></kernel-context-menu>`;
    await flush();
    expect(names()).toEqual(["Actions", "More", "Add", "Context menu", "File actions", "Kontextmenü"]);
    const contextMenu = document.querySelector("kernel-context-menu")!;
    contextMenu.setAttribute("label", "Row actions");
    expect(names()[3]).toBe("Row actions");
  });

  // APG grid: after arrowing, Tab away and back returns to the same day.
  it.each([
    { name: "DatePicker", react: () => <DatePicker defaultValue={new Date(2026, 0, 15)} />, element: `<kernel-date-picker value="2026-01-15"></kernel-date-picker>` },
    {
      name: "DateRangePicker",
      react: () => <DateRangePicker defaultValue={{ from: new Date(2026, 0, 12), to: new Date(2026, 0, 15) }} />,
      element: `<kernel-date-range-picker value-from="2026-01-12" value-to="2026-01-15"></kernel-date-range-picker>`,
    },
  ])("$name moves its one Tab stop with arrow-key focus", async ({ react, element }) => {
    const tabStops = () => Array.from(document.querySelectorAll<HTMLButtonElement>("button[data-day]")).filter((b) => b.tabIndex === 0).map((b) => b.textContent);
    const arrowRight = async () => {
      await act(async () => {
        document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
      });
    };
    for (const mount of [() => render(react()), () => (document.body.innerHTML = element)]) {
      mount();
      await flush();
      expect(tabStops()).toHaveLength(1);
      const start = Array.from(document.querySelectorAll<HTMLButtonElement>("button[data-day]")).find((b) => b.tabIndex === 0)!;
      await act(async () => start.focus());
      await arrowRight();
      await arrowRight();
      expect(document.activeElement?.textContent).toBe(String(Number(start.textContent) + 2));
      expect(tabStops()).toEqual([document.activeElement?.textContent]);
      cleanup();
      document.body.innerHTML = "";
    }
  });
});
