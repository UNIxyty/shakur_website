import { useMemo } from 'react';
import { motion, type Variants } from 'framer-motion';
import type { ReactNode, ElementType } from 'react';
import { reveal, stagger, viewportOnce } from '../motion';

/**
 * `motion(as)` returns a NEW component type on every call. Calling it inline
 * during render made React treat the element as a different component each
 * re-render and remount the whole subtree — visibly, any state change on a
 * page wiped what the visitor had typed into uncontrolled inputs below a
 * Reveal (the contact form cleared when the purpose dropdown changed).
 * Memoize per `as` so the type stays stable across renders.
 */
function useMotionComponent(as: ElementType) {
  return useMemo(() => motion(as), [as]);
}

type Common = {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: ElementType;
  variants?: Variants;
  /**
   * Anything else (id, onSubmit, aria-*) is forwarded to the underlying element.
   * `as` can be any tag, so the prop surface can't be typed more precisely here.
   */
  [key: string]: unknown;
};

type RevealProps = Common & {
  /** Delay before this element's own reveal, in seconds. */
  delay?: number;
};

/** A single element that fades + rises into view once. */
export function Reveal({ children, className, style, as = 'div', variants, delay, ...rest }: RevealProps) {
  const Comp = useMotionComponent(as as ElementType);
  return (
    <Comp
      className={className}
      style={style}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={variants ?? reveal}
      transition={delay ? { delay } : undefined}
      {...rest}
    >
      {children}
    </Comp>
  );
}

type GroupProps = Common & {
  /** Seconds between each child's reveal. */
  gap?: number;
  delayChildren?: number;
};

/**
 * Staggers direct children that are `<RevealItem>`s (or any motion element using
 * the `hidden`/`visible` variant names).
 */
export function RevealGroup({
  children,
  className,
  style,
  as = 'div',
  gap = 0.08,
  delayChildren = 0,
  ...rest
}: GroupProps) {
  const Comp = useMotionComponent(as as ElementType);
  return (
    <Comp
      className={className}
      style={style}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={stagger(gap, delayChildren)}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/** A child of <RevealGroup>. Inherits the parent's stagger timing. */
export function RevealItem({ children, className, style, as = 'div', variants, ...rest }: Common) {
  const Comp = useMotionComponent(as as ElementType);
  return (
    <Comp className={className} style={style} variants={variants ?? reveal} {...rest}>
      {children}
    </Comp>
  );
}
