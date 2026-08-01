# @kernelui-lib/react

Accessible React components built on real semantic HTML.

## Install

```bash
npm install @kernelui-lib/react @kernelui-lib/styles
```

## Usage

```tsx
import "@kernelui-lib/styles";
import "@kernelui-lib/react/styles.css";

import { Button } from "@kernelui-lib/react";

export function App() {
  return <Button variant="primary">Save changes</Button>;
}
```

Requires React 18 or newer.

## Docs

Full documentation, live demos, and API reference: [kernelui.com](https://www.kernelui.com/)

For LLM/agent usage, this package ships `llms.txt` in the npm tarball. The docs site also publishes `/llms.txt`, `/llms-full.txt`, and `/registry.json`.

Quick setup: `npx @kernelui-lib/cli init`

## License

MIT
