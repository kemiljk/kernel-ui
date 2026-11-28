# Elements overlay

Files copied over `evals/template/` for tasks with `"package": "elements"`.
The runner deletes the React entry (`src/main.tsx`, `src/App.tsx`) first, so
the app is plain HTML and TypeScript with `@kernelui-lib/elements`. Everything
else (Vite, TypeScript, ESLint, installed packages) is shared with the React
template.
