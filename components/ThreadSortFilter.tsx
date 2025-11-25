"use client";

import { useState } from "react";
import Tooltip from "./Tooltip";

type SortOption = "newest" | "oldest" | "most_comments" | "least_comments";

interface ThreadSortFilterProps {
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export default function ThreadSortFilter({
  currentSort,
  onSortChange,
}: ThreadSortFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sortOptions: { value: SortOption; label: string; icon: string }[] = [
    { value: "newest", label: "Más recientes", icon: "🕐" },
    { value: "oldest", label: "Más antiguos", icon: "📅" },
    { value: "most_comments", label: "Más comentados", icon: "💬" },
    { value: "least_comments", label: "Menos comentados", icon: "🔇" },
  ];

  const currentOption = sortOptions.find((opt) => opt.value === currentSort);

  return (
    <div className="relative">
      <Tooltip content="Ordenar hilos" position="bottom">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors"
          style={{
            background: "var(--card-bg)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--border-hover)";
            e.currentTarget.style.boxShadow = "var(--shadow-sm)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <span>{currentOption?.icon}</span>
          <span className="text-sm font-medium">{currentOption?.label}</span>
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </Tooltip>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="absolute top-full left-0 mt-2 w-48 rounded-lg border shadow-lg z-20"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--border)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onSortChange(option.value);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg"
                style={{
                  color:
                    currentSort === option.value
                      ? "var(--brand)"
                      : "var(--foreground)",
                  background:
                    currentSort === option.value
                      ? "var(--brand-light)"
                      : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (currentSort !== option.value) {
                    e.currentTarget.style.background = "var(--card-hover)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentSort !== option.value) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <span>{option.icon}</span>
                <span className="font-medium">{option.label}</span>
                {currentSort === option.value && (
                  <svg
                    className="w-4 h-4 ml-auto"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

