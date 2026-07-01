import { forwardRef, useState } from "react";
import type { ImgHTMLAttributes } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Avatar.module.css";

export interface AvatarState {
  loaded: boolean;
}

export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "className"> {
  /** Shown while there's no `src`, or if the image fails to load.
   * Usually initials. */
  fallback: string;
  className?: ClassNameValue<AvatarState>;
}

/**
 * A real `<img>` when there's a picture to show. Broken and missing
 * images can't be detected in CSS alone, so the fallback swap is the one
 * piece of unavoidable JavaScript here (an `onError` handler), everything
 * else, alt text and all, is the browser's native image handling.
 */
export const Avatar = forwardRef<HTMLImageElement, AvatarProps>(function Avatar(
  { src, alt, fallback, className, onError, ...rest },
  ref,
) {
  const [errored, setErrored] = useState(false);
  const showFallback = !src || errored;
  const state: AvatarState = { loaded: !showFallback };

  return (
    <span
      className={[styles.root, resolveClassName(className, state)]
        .filter(Boolean)
        .join(" ")}
    >
      {showFallback ? (
        <span className={styles.fallback} aria-hidden={alt ? undefined : true}>
          {fallback}
        </span>
      ) : (
        <img
          {...rest}
          ref={ref}
          src={src}
          alt={alt}
          className={styles.image}
          onError={(event) => {
            setErrored(true);
            onError?.(event);
          }}
        />
      )}
    </span>
  );
});
