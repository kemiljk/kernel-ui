import { Tab, TabPanel, Tabs, TabsList } from "@kernelui-lib/react";
import CopyButton from "../CopyButton";

const PACKAGES = "@kernelui-lib/react @kernelui-lib/styles";

const MANAGERS = [
  { id: "npm", command: `npm install ${PACKAGES}` },
  { id: "pnpm", command: `pnpm add ${PACKAGES}` },
  { id: "yarn", command: `yarn add ${PACKAGES}` },
  { id: "bun", command: `bun add ${PACKAGES}` },
] as const;

/**
 * The hero's install line: a real command you can copy, in the package
 * manager you actually use. Built from the library's own Tabs (pill
 * shape, so it reads as a compact switch next to the hero buttons) and
 * the same CopyButton every docs code block uses.
 */
export default function InstallCommand() {
  return (
    <Tabs defaultValue="npm" className="install-command">
      <TabsList aria-label="Package manager" shape="pill">
        {MANAGERS.map(({ id }) => (
          <Tab key={id} value={id}>
            {id}
          </Tab>
        ))}
      </TabsList>
      {MANAGERS.map(({ id, command }) => (
        <TabPanel key={id} value={id}>
          <div className="install-command-line">
            <code>{command}</code>
            <CopyButton text={command} />
          </div>
        </TabPanel>
      ))}
    </Tabs>
  );
}
