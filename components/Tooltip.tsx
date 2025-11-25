"use client";

import { useState, useRef, useEffect } from "react";

export type TooltipPosition = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: TooltipPosition;
  delay?: number;
  disabled?: boolean;
}

export default function Tooltip({
  content,
  children,
  position = "top",
  delay = 300,
  disabled = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>(position);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && tooltipRef.current && wrapperRef.current) {
      const tooltip = tooltipRef.current;
      const wrapper = wrapperRef.current;
      const rect = wrapper.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Auto-adjust position if tooltip would overflow
      let adjustedPosition = position;

      if (position === "top" && rect.top - tooltipRect.height < 0) {
        adjustedPosition = "bottom";
      } else if (position === "bottom" && rect.bottom + tooltipRect.height > viewportHeight) {
        adjustedPosition = "top";
      } else if (position === "left" && rect.left - tooltipRect.width < 0) {
        adjustedPosition = "right";
      } else if (position === "right" && rect.right + tooltipRect.width > viewportWidth) {
        adjustedPosition = "left";
      }

      setTooltipPosition(adjustedPosition);
    }
  }, [isVisible, position]);

  const handleMouseEnter = () => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getPositionClasses = () => {
    switch (tooltipPosition) {
      case "top":
        return "bottom-full left-1/2 -translate-x-1/2 mb-2";
      case "bottom":
        return "top-full left-1/2 -translate-x-1/2 mt-2";
      case "left":
        return "right-full top-1/2 -translate-y-1/2 mr-2";
      case "right":
        return "left-full top-1/2 -translate-y-1/2 ml-2";
    }
  };

  const getArrowStyles = () => {
    const borderColor = "var(--foreground)";
    switch (tooltipPosition) {
      case "top":
        return {
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          borderTopColor: borderColor,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: "transparent",
        };
      case "bottom":
        return {
          bottom: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          borderBottomColor: borderColor,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: "transparent",
        };
      case "left":
        return {
          left: "100%",
          top: "50%",
          transform: "translateY(-50%)",
          borderLeftColor: borderColor,
          borderTopColor: "transparent",
          borderBottomColor: "transparent",
          borderRightColor: "transparent",
        };
      case "right":
        return {
          right: "100%",
          top: "50%",
          transform: "translateY(-50%)",
          borderRightColor: borderColor,
          borderTopColor: "transparent",
          borderBottomColor: "transparent",
          borderLeftColor: "transparent",
        };
    }
  };

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <div
      ref={wrapperRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-[10000] pointer-events-none ${getPositionClasses()} animate-tooltip-fade-in`}
          role="tooltip"
        >
          <div
            className="px-2 py-1 text-xs font-medium rounded shadow-lg whitespace-nowrap relative"
            style={{
              background: "var(--foreground)",
              color: "var(--background)",
              border: "1px solid var(--border)",
            }}
          >
            {content}
            {/* Arrow */}
            <div
              className="absolute w-0 h-0 border-4"
              style={getArrowStyles()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

