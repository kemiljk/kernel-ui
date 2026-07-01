import { Children, createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { dataAttr, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Carousel.module.css";

interface CarouselContextValue {
  register: (id: string, node: HTMLElement | null) => void;
  scrollToSlide: (id: string) => void;
  currentId: string | null;
  order: string[];
}

const CarouselContext = createContext<CarouselContextValue | null>(null);

function useCarouselContext(component: string) {
  const context = useContext(CarouselContext);
  if (!context) throw new Error(`${component} must be used inside <Carousel>.`);
  return context;
}

export interface CarouselProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "className" | "children"> {
  children: ReactNode;
  "aria-label": string;
  className?: ClassNameValue<Record<string, never>>;
}

/**
 * A real scroll container: `scroll-snap-type` + native overflow scrolling
 * do the actual carousel work (touch, trackpad, momentum, arrow keys once
 * focused), not a JS drag/animation engine. The only JS here is wiring
 * Prev/Next and the dots to `scrollIntoView`, and an `IntersectionObserver`
 * that watches each slide against the scroll container to know which one
 * is currently in view.
 */
export function Carousel({ children, "aria-label": ariaLabel, className, ...rest }: CarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const slideNodes = useRef(new Map<string, HTMLElement>());
  const [order, setOrder] = useState<string[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const orderRef = useRef<string[]>([]);

  function register(id: string, node: HTMLElement | null) {
    if (node) {
      slideNodes.current.set(id, node);
      if (!orderRef.current.includes(id)) orderRef.current = [...orderRef.current, id];
    } else {
      slideNodes.current.delete(id);
      orderRef.current = orderRef.current.filter((existing) => existing !== id);
    }
    setOrder(orderRef.current);
  }

  // The real, correct way to know what's "current" during native scrolling
  // is to ask the browser what's actually visible, not to derive it from
  // scrollLeft math (which has to assume a slide width that may not hold).
  useEffect(() => {
    const track = trackRef.current;
    if (!track || order.length === 0) return;

    const ratios = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.carouselSlideId;
          if (id) ratios.set(id, entry.intersectionRatio);
        }
        let bestId: string | null = null;
        let bestRatio = 0;
        for (const id of orderRef.current) {
          const ratio = ratios.get(id) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        if (bestId) setCurrentId(bestId);
      },
      { root: track, threshold: [0.25, 0.5, 0.75, 0.98] },
    );

    for (const id of order) {
      const node = slideNodes.current.get(id);
      if (node) observer.observe(node);
    }

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.join(",")]);

  function scrollToSlide(id: string) {
    slideNodes.current.get(id)?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }

  const context = useMemo<CarouselContextValue>(
    () => ({ register, scrollToSlide, currentId, order }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentId, order.join(",")],
  );

  const currentIndex = currentId ? order.indexOf(currentId) : -1;

  return (
    <CarouselContext.Provider value={context}>
      <div
        {...rest}
        role="region"
        aria-label={ariaLabel}
        aria-roledescription="carousel"
        className={[styles.root, resolveClassName(className, {})].filter(Boolean).join(" ")}
      >
        <div
          ref={trackRef}
          className={styles.track}
          // A `<div>` with `overflow: auto` isn't in the tab order by
          // default, so without this, arrow-key/Page-Up-Down scrolling
          // (which native scroll containers give you for free) would be
          // unreachable from the keyboard entirely.
          tabIndex={0}
        >
          {children}
        </div>

        <button
          type="button"
          aria-label="Previous slide"
          className={styles.prev}
          disabled={currentIndex <= 0}
          onClick={() => {
            const target = order[currentIndex - 1];
            if (target) scrollToSlide(target);
          }}
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="16" height="16">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Next slide"
          className={styles.next}
          disabled={currentIndex === -1 || currentIndex >= order.length - 1}
          onClick={() => {
            const target = order[currentIndex + 1];
            if (target) scrollToSlide(target);
          }}
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="16" height="16">
            <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {order.length > 1 ? (
          <div className={styles.dots}>
            {order.map((id, index) => (
              <button
                key={id}
                type="button"
                aria-label={`Go to slide ${index + 1}`}
                aria-current={dataAttr(id === currentId)}
                data-current={dataAttr(id === currentId)}
                className={styles.dot}
                onClick={() => scrollToSlide(id)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </CarouselContext.Provider>
  );
}

export interface CarouselSlideProps {
  children: ReactNode;
}

/** Full-width-per-slide by default (`flex: 0 0 100%`), so the carousel
 * reads as one slide at a time. A "peek the next slide" layout (e.g.
 * `flex-basis: 85%`) is a reasonable variant but needs a width prop to do
 * well, so it's left for a future revision rather than guessed at here. */
export function CarouselSlide({ children }: CarouselSlideProps) {
  const id = useId();
  const { register, currentId } = useCarouselContext("CarouselSlide");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    register(id, ref.current);
    return () => register(id, null);
  }, [id, register]);

  return (
    <div
      ref={ref}
      data-carousel-slide-id={id}
      role="group"
      aria-roledescription="slide"
      aria-current={dataAttr(id === currentId)}
      className={styles.slide}
    >
      {children}
    </div>
  );
}
