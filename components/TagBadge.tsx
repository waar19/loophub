"use client";

import Link from "next/link";

interface TagBadgeProps {
  name: string;
  slug: string;
  color?: string;
  size?: "sm" | "md";
  onClick?: () => void;
  removable?: boolean;
  onRemove?: () => void;
}

export default function TagBadge({
  name,
  slug,
  color = "#6B7280",
  size = "sm",
  onClick,
  removable = false,
  onRemove,
}: TagBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
  };

  const content = (
    <>
      <span
        className="w-2 h-2 rounded-full mr-1.5"
        style={{ backgroundColor: color }}
      />
      {name}
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1.5 hover:text-red-500 transition-colors"
          aria-label={`Remove tag ${name}`}
        >
          ×
        </button>
      )}
    </>
  );

  const baseClasses = `inline-flex items-center rounded-full font-medium transition-colors ${sizeClasses[size]}`;
  const style = {
    backgroundColor: `${color}20`,
    color: color,
  };

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${baseClasses} hover:opacity-80`}
        style={style}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={`/search?tag=${slug}`}
      className={`${baseClasses} hover:opacity-80`}
      style={style}
    >
      {content}
    </Link>
  );
}
