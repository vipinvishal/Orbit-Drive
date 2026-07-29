"use client";

import { motion, useScroll } from "motion/react";

// Thin gold bar at the very top that fills as you scroll — a small nod to
// the product itself (a drive filling up) rather than a generic progress bar.
export default function ScrollFillBar() {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2.5,
        background: "linear-gradient(90deg, var(--chart-1), var(--gold), var(--chart-4))",
        transformOrigin: "0%",
        scaleX: scrollYProgress,
        zIndex: 200,
      }}
    />
  );
}
