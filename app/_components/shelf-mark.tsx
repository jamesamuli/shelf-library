/**
 * The Shelf icon (assets/shelf-library-brand/01-logo/icon/Icon only.svg) —
 * the app's logo since the CDI chose the monogram over the horizontal lockup,
 * whose live "Shelf" / "LIBRARY" text needed two extra font families.
 *
 * Inlined with its fills mapped to theme tokens so it follows light and dark
 * — the source's navy books would vanish on a dark ground. `ink` colours the
 * navy books and shelf; `gap` the bands across the spines, which should be
 * the colour of whatever the mark sits on, so they read as gaps. Gestion's
 * sidebar is navy in both themes and passes its own pair.
 *
 * With a `label` it is the logo (an image with that name); without, a
 * decoration hidden from assistive technology.
 *
 * `hopping`: the three books hop in turn, a wave along the shelf — the
 * OPAC's loading screen (`RouteLoader`). Each book is its own group so it can
 * move alone; the shelf stays put.
 */
export function ShelfMark({
  className,
  label,
  ink = "fill-primary",
  gap = "fill-surface-muted",
  hopping = false,
}: {
  className?: string;
  label?: string;
  ink?: string;
  gap?: string;
  hopping?: boolean;
}) {
  const hop = (delay: string) =>
    hopping
      ? `animate-book-hop motion-reduce:animate-none ${delay}`
      : undefined;
  return (
    <svg
      viewBox="40 45 120 108"
      className={className}
      {...(label
        ? { role: "img", "aria-label": label }
        : { "aria-hidden": true })}
    >
      <g className={hop("[animation-delay:0s]")}>
        <path
          className={ink}
          d="M61.36,130.7h14.76c1.56,0,2.82-1.26,2.82-2.82V49.71c0-1.56-1.26-2.82-2.82-2.82h-14.76c-1.56,0-2.82,1.26-2.82,2.82v78.18c0,1.56,1.26,2.82,2.82,2.82Z"
        />
        <rect className={gap} x="58.54" y="57.34" width="20.39" height="1.63" />
        <rect
          className={gap}
          x="58.54"
          y="121.24"
          width="20.39"
          height="1.67"
        />
      </g>
      <g className={hop("[animation-delay:0.15s]")}>
        <path
          className="fill-secondary"
          d="M86.46,130.7h14.76c1.56,0,2.82-1.26,2.82-2.82v-63.95h-20.39v63.95c0,1.56,1.26,2.82,2.82,2.82Z"
        />
        <path
          className="fill-secondary"
          d="M104.03,53.96c0-1.56-1.26-2.82-2.82-2.82h-14.76c-1.56,0-2.82,1.26-2.82,2.82v2.54h20.39v-2.54Z"
        />
        <rect
          className="fill-secondary"
          x="83.64"
          y="58.17"
          width="20.39"
          height="4.1"
        />
        <rect className={gap} x="83.64" y="56.5" width="20.39" height="1.67" />
        <rect className={gap} x="83.64" y="62.27" width="20.39" height="1.67" />
      </g>
      <g className={hop("[animation-delay:0.3s]")}>
        <path
          className="fill-accent"
          d="M107.23,72.8l19.88-4.54.3,1.31-19.88,4.54,11.97,52.49,19.88-4.54-12.61-55.28c-.35-1.52-1.86-2.47-3.37-2.12l-14.39,3.28c-1.52.35-2.47,1.86-2.12,3.37l.34,1.48Z"
        />
        <path
          className="fill-accent"
          d="M119.57,126.9l.37,1.62c.35,1.52,1.86,2.47,3.37,2.12l14.39-3.28c1.52-.35,2.47-1.86,2.12-3.37l-.14-.6-19.88,4.54-.23-1.03Z"
        />
        <rect
          className={gap}
          x="107.12"
          y="70.52"
          width="20.39"
          height="1.35"
          transform="translate(-12.9 27.88) rotate(-12.85)"
        />
        <polygon
          className={gap}
          points="119.57 126.9 119.8 127.92 139.68 123.39 139.38 122.07 119.5 126.61"
        />
      </g>
      <rect
        className={ink}
        x="41.53"
        y="136.33"
        width="116.95"
        height="13.99"
        rx="1.65"
      />
    </svg>
  );
}
