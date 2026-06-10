import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  format?: (val: number) => string;
  className?: string;
}

export function AnimatedNumber({ value, format = (v) => v.toString(), className }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const count = useMotionValue(displayValue);
  const rounded = useTransform(count, (latest) => format(latest));

  useEffect(() => {
    const animation = animate(count, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplayValue(latest);
      }
    });

    return animation.stop;
  }, [value, count]);

  return <motion.span className={className}>{rounded}</motion.span>;
}
