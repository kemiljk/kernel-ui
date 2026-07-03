import { Carousel, CarouselSlide } from "@kernelui-lib/react";

const slides = ["Slide 1", "Slide 2", "Slide 3", "Slide 4"];

export default function CarouselDemo() {
  return (
    <div style={{ inlineSize: "100%", maxInlineSize: "28rem" }}>
      <Carousel aria-label="Example slides">
        {slides.map((label) => (
          <CarouselSlide key={label}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                blockSize: "12rem",
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
}
