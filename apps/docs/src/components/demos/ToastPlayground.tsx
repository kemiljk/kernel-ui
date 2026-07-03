import { Button, ToastViewport, toast } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  {
    type: "enum" as const,
    prop: "variant",
    options: ["default", "success", "warning", "danger"],
    default: "default",
  },
  { type: "text" as const, prop: "title", default: "Changes published" },
  { type: "text" as const, prop: "description", default: "" },
  { type: "number" as const, prop: "duration", default: 4000, min: 0, max: 10000, step: 500 },
];

function buildOptions(values: PlaygroundValues) {
  const options: { description?: string; duration?: number } = {};
  if (values.description) options.description = String(values.description);
  if (Number(values.duration) !== 4000) options.duration = Number(values.duration);
  return Object.keys(options).length > 0 ? options : undefined;
}

function fire(values: PlaygroundValues) {
  const options = buildOptions(values);
  if (values.variant === "default") toast(String(values.title), options);
  else toast[values.variant as "success" | "warning" | "danger"](String(values.title), options);
}

function optionsLiteral(values: PlaygroundValues) {
  const fields: string[] = [];
  if (values.description) fields.push(`description: "${values.description}"`);
  if (Number(values.duration) !== 4000) fields.push(`duration: ${Number(values.duration)}`);
  return fields.length > 0 ? `{ ${fields.join(", ")} }` : undefined;
}

function code(values: PlaygroundValues) {
  const call = values.variant === "default" ? "toast" : `toast.${values.variant}`;
  const args = [`"${values.title}"`];
  const options = optionsLiteral(values);
  if (options) args.push(options);
  return `<Button onClick={() => ${call}(${args.join(", ")})}>Publish</Button>
<ToastViewport />`;
}

function elementsCode(values: PlaygroundValues) {
  const call = values.variant === "default" ? "toast" : `toast.${values.variant}`;
  const args = [`"${values.title}"`];
  const options = optionsLiteral(values);
  if (options) args.push(options);
  return `<kernel-button id="publish">Publish</kernel-button>
<kernel-toast-viewport></kernel-toast-viewport>

<script type="module">
  import { toast } from "@kernelui/elements";

  document.getElementById("publish").addEventListener("click", () => {
    ${call}(${args.join(", ")});
  });
</script>`;
}

export default function ToastPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <>
          <Button variant="primary" onClick={() => fire(values)}>
            Publish
          </Button>
          <ToastViewport />
        </>
      )}
    />
  );
}
