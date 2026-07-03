import { Carousel, CarouselSlide } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "ariaLabel", label: "aria-label", default: "Example slides" },
  { type: "number" as const, prop: "count", label: "slides", default: 4, min: 2, max: 6, step: 1 },
];

function code(values: PlaygroundValues) {
  return `<Carousel aria-label="${values.ariaLabel}">
  {slides.map((label) => (
    <CarouselSlide key={label}>{label}</CarouselSlide>
  ))}
</Carousel>`;
}

function elementsCode(values: PlaygroundValues) {
  const slides = Array.from({ length: Number(values.count) }, (_, i) => `Slide ${i + 1}`);
  const slideMarkup = slides
    .map((label) => `  <kernel-carousel-slide>${label}</kernel-carousel-slide>`)
    .join("\n");
  return `<kernel-carousel aria-label="${values.ariaLabel}">\n${slideMarkup}\n</kernel-carousel>`;
}

export default function CarouselPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => {
        const slides = Array.from({ length: Number(values.count) }, (_, i) => `Slide ${i + 1}`);
        return (
          <div style={{ inlineSize: "100%", maxInlineSize: "28rem" }}>
            <Carousel aria-label={String(values.ariaLabel)}>
              {slides.map((label) => (
                <CarouselSlide key={label}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      blockSize: "10rem",
                      margin: "0 var(--kernel-space-1)",
                      borderRadius: "var(--kernel-radius-container)",
                      backgroundColor: "var(--kernel-color-accent-subtle)",
                      color: "var(--kernel-color-accent-text)",
                      fontSize: "var(--kernel-font-size-lg)",
                      fontWeight: 600,
                    }}
                  >
                    {label}
                  </div>
                </CarouselSlide>
              ))}
            </Carousel>
          </div>
        );
      }}
    />
  );
}
