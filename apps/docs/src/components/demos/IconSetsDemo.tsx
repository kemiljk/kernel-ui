import type { ComponentType, CSSProperties, SVGProps } from "react";
import { Badge, Button, Suggestion, SuggestionItem, Tab, TabPanel, Tabs, TabsList } from "@kernelui-lib/react";
import * as Lucide from "lucide-react";
import * as Phosphor from "@phosphor-icons/react";
import * as HeroOutline from "@heroicons/react/24/outline";
import * as Tabler from "@tabler/icons-react";
import * as Radix from "@radix-ui/react-icons";
import CopyButton from "../CopyButton";
import { HighlightedCode } from "../HighlightedCode";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

interface IconSet {
  id: string;
  name: string;
  /** What a consumer actually writes: the package and how icons import. */
  importLine: string;
  /** Drawn size inside Kernel's 1lh icon slot. Each set pads its glyphs
   * differently inside its viewBox, so the value that makes the glyphs
   * match Kernel's type differs per set. */
  size: string;
  /** Stroke override in the set's own viewBox units, or null for filled
   * sets, where there is no stroke to even out. */
  stroke: string | null;
  icons: { check: Icon; plus: Icon; arrow: Icon; search: Icon; bolt: Icon };
}

// The tuned values are the point of this page: one pair of tokens per set
// makes its icons sit at the same optical size and weight as every other
// set, next to Kernel's text.
const SETS: IconSet[] = [
  {
    id: "lucide",
    name: "Lucide",
    importLine: 'import { Check, Plus, ArrowRight, Search, Zap } from "lucide-react";',
    size: "1.15em",
    stroke: "1.75",
    icons: { check: Lucide.Check, plus: Lucide.Plus, arrow: Lucide.ArrowRight, search: Lucide.Search, bolt: Lucide.Zap },
  },
  {
    id: "phosphor",
    name: "Phosphor",
    importLine:
      'import { Check, Plus, ArrowRight, MagnifyingGlass, Lightning } from "@phosphor-icons/react";',
    size: "1.2em",
    stroke: null,
    icons: {
      check: Phosphor.Check as Icon,
      plus: Phosphor.Plus as Icon,
      arrow: Phosphor.ArrowRight as Icon,
      search: Phosphor.MagnifyingGlass as Icon,
      bolt: Phosphor.Lightning as Icon,
    },
  },
  {
    id: "heroicons",
    name: "Heroicons",
    importLine:
      'import { CheckIcon, PlusIcon, ArrowRightIcon, MagnifyingGlassIcon, BoltIcon } from "@heroicons/react/24/outline";',
    size: "1.2em",
    stroke: "1.5",
    icons: {
      check: HeroOutline.CheckIcon,
      plus: HeroOutline.PlusIcon,
      arrow: HeroOutline.ArrowRightIcon,
      search: HeroOutline.MagnifyingGlassIcon,
      bolt: HeroOutline.BoltIcon,
    },
  },
  {
    id: "tabler",
    name: "Tabler",
    importLine:
      'import { IconCheck, IconPlus, IconArrowRight, IconSearch, IconBolt } from "@tabler/icons-react";',
    size: "1.2em",
    stroke: "1.6",
    icons: {
      check: Tabler.IconCheck as Icon,
      plus: Tabler.IconPlus as Icon,
      arrow: Tabler.IconArrowRight as Icon,
      search: Tabler.IconSearch as Icon,
      bolt: Tabler.IconBolt as Icon,
    },
  },
  {
    id: "radix",
    name: "Radix Icons",
    importLine:
      'import { CheckIcon, PlusIcon, ArrowRightIcon, MagnifyingGlassIcon, LightningBoltIcon } from "@radix-ui/react-icons";',
    size: "1.25em",
    stroke: null,
    icons: {
      check: Radix.CheckIcon as Icon,
      plus: Radix.PlusIcon as Icon,
      arrow: Radix.ArrowRightIcon as Icon,
      search: Radix.MagnifyingGlassIcon as Icon,
      bolt: Radix.LightningBoltIcon as Icon,
    },
  },
];

/** One name per line, so the snippet never runs under the copy button. */
function importBlock(line: string) {
  const match = line.match(/^import \{ (.+) \} from (".+");$/);
  if (!match) return line;
  const names = match[1]!.split(", ").map((name) => `  ${name},`);
  return `import {\n${names.join("\n")}\n} from ${match[2]};`;
}

function tokensCss(set: IconSet) {
  const lines = [`  --kernel-icon-size: ${set.size};`];
  lines.push(
    set.stroke
      ? `  --kernel-icon-stroke-width: ${set.stroke};`
      : "  /* Filled icons: no stroke to override. */",
  );
  return `:root {\n${lines.join("\n")}\n}`;
}

function Scene({ set }: { set: IconSet }) {
  const { check: Check, plus: Plus, arrow: Arrow, search: Search, bolt: Bolt } = set.icons;
  const style = {
    "--kernel-icon-size": set.size,
    ...(set.stroke ? { "--kernel-icon-stroke-width": set.stroke } : {}),
  } as CSSProperties;
  return (
    <div className="icon-sets-scene" style={style}>
      <div className="icon-sets-row">
        <Button variant="primary" iconStart={<Check />}>
          Done
        </Button>
        <Button iconStart={<Search />}>Search</Button>
        <Button iconEnd={<Arrow />}>Continue</Button>
        <Button variant="ghost" aria-label="Add" iconStart={<Plus />} />
      </div>
      <div className="icon-sets-row">
        <Badge variant="success">
          <Check /> Shipped
        </Badge>
        <Badge variant="accent">
          <Plus /> New
        </Badge>
        <Badge>
          Next <Arrow />
        </Badge>
      </div>
      <Suggestion>
        <SuggestionItem>
          <Bolt /> Summarise this thread
        </SuggestionItem>
        <SuggestionItem>
          Draft a reply <Arrow />
        </SuggestionItem>
      </Suggestion>
    </div>
  );
}

export default function IconSetsDemo() {
  return (
    <Tabs defaultValue={SETS[0]!.id} className="icon-sets">
      <TabsList aria-label="Icon set" shape="pill">
        {SETS.map((set) => (
          <Tab key={set.id} value={set.id}>
            {set.name}
          </Tab>
        ))}
      </TabsList>
      {SETS.map((set) => {
        const code = `${importBlock(set.importLine)}\n\n${tokensCss(set)}`;
        return (
          <TabPanel key={set.id} value={set.id} className="icon-sets-panel">
            <Scene set={set} />
            <div className="code-block">
              <pre>
                <code>
                  <HighlightedCode code={code} />
                </code>
              </pre>
              <CopyButton text={code} />
            </div>
          </TabPanel>
        );
      })}
    </Tabs>
  );
}
