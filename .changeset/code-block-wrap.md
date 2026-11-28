---
"@kernelui-lib/react": minor
"@kernelui-lib/elements": minor
---

CodeBlock: `wrap` prop (React) and `wrap` attribute (`<kernel-code-block>`), off by default. Long lines wrap instead of scrolling sideways, keep their indentation, and break anywhere a long identifier needs to. With line numbers, every line is now a row of one CSS subgrid, so the number column is as wide as the widest number: code on line 9 and line 10 starts at the same x (it was off by a digit before), and a wrapped line's number stays on its first visual line.
