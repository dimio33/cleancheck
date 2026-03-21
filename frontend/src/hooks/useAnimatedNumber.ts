import { useSpring, useTransform, type MotionValue } from 'framer-motion';
import { useEffect } from 'react';

/**
 * Animated number counter using Framer Motion spring.
 * Returns a MotionValue that smoothly transitions to the target value.
 */
export function useAnimatedNumber(value: number, duration: number = 0.8): MotionValue<string> {
  const spring = useSpring(0, { duration: duration * 1000, bounce: 0 });
  const display = useTransform(spring, (v) => v.toFixed(1));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return display;
}

/**
 * Animated integer counter (no decimals).
 */
export function useAnimatedInt(value: number, duration: number = 0.8): MotionValue<string> {
  const spring = useSpring(0, { duration: duration * 1000, bounce: 0 });
  const display = useTransform(spring, (v) => Math.round(v).toString());

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return display;
}
