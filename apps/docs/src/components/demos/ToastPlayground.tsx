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
];

function fire(values: PlaygroundValues) {
  const options = values.description ? { description: String(values.description) } : undefined;
  if (values.variant === "default") toast(String(values.title), options);
  else toast[values.variant as "success" | "warning" | "danger"](String(values.title), options);
}

function code(values: PlaygroundValues) {
  const call = values.variant === "default" ? "toast" : `toast.${values.variant}`;
  const args = [`"${values.title}"`];
  if (values.description) args.push(`{ description: "${values.description}" }`);
  return `<Button onClick={() => ${call}(${args.join(", ")})}>Publish</Button>
<ToastViewport />`;
}

function elementsCode(values: PlaygroundValues) {
  const call = values.variant === "default" ? "toast" : `toast.${values.variant}`;
  const args = [`"${values.title}"`];
  if (values.description) args.push(`{ description: "${values.description}" }`);
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
