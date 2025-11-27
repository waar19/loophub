"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface MotionWrapperProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  duration?: number;
  scale?: boolean;
}

export default function MotionWrapper({
  children,
  className = "",
  delay = 0,
  direction = "up",
  duration = 0.4,
  scale = false,
}: MotionWrapperProps) {
  const getVariants = () => {
    const variants = {
      hidden: { opacity: 0, x: 0, y: 0, scale: scale ? 0.95 : 1 },
      visible: {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        transition: {
          duration,
          delay,
        },
      },
    };

    if (direction === "up") variants.hidden.y = 20;
    if (direction === "down") variants.hidden.y = -20;
    if (direction === "left") variants.hidden.x = 20;
    if (direction === "right") variants.hidden.x = -20;

    return variants;
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={getVariants()}
      className={className}
    >
      {children}
    </motion.div>
  );
}
