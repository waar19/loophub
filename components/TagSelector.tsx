"use client";

import { useState, useEffect, useRef } from "react";
import TagBadge from "./TagBadge";

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
  usage_count?: number;
}

interface TagSelectorProps {
  threadId: string;
  initialTags?: Tag[];
  editable?: boolean;
  maxTags?: number;
  onTagsChange?: (tags: Tag[]) => void;
}

export default function TagSelector({
  threadId,
  initialTags = [],
  editable = false,
  maxTags = 5,
  onTagsChange,
}: TagSelectorProps) {
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [isAdding, setIsAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch tags for thread on mount
  useEffect(() => {
    if (initialTags.length === 0 && threadId) {
      fetchThreadTags();
    }
  }, [threadId]);

  // Search suggestions when query changes
  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const searchTags = async () => {
      try {
        const response = await fetch(`/api/tags?q=${encodeURIComponent(query)}&limit=5`);
        if (response.ok) {
          const data = await response.json();
          // Filter out already selected tags
          const filtered = (data.tags || []).filter(
            (t: Tag) => !tags.some((existing) => existing.id === t.id)
          );
          setSuggestions(filtered);
        }
      } catch (error) {
        console.error("Error searching tags:", error);
      }
    };

    const debounce = setTimeout(searchTags, 200);
    return () => clearTimeout(debounce);
  }, [query, tags]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsAdding(false);
        setQuery("");
        setSuggestions([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchThreadTags = async () => {
    try {
      const response = await fetch(`/api/tags?threadId=${threadId}`);
      if (response.ok) {
        const data = await response.json();
        setTags(data.tags || []);
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const addTag = async (tagName: string) => {
    if (tags.length >= maxTags) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, tagName }),
      });

      if (response.ok) {
        const data = await response.json();
        setTags(data.tags || []);
        onTagsChange?.(data.tags || []);
      }
    } catch (error) {
      console.error("Error adding tag:", error);
    } finally {
      setIsLoading(false);
      setQuery("");
      setSuggestions([]);
      setIsAdding(false);
    }
  };

  const removeTag = async (tagId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/tags", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, tagId }),
      });

      if (response.ok) {
        const newTags = tags.filter((t) => t.id !== tagId);
        setTags(newTags);
        onTagsChange?.(newTags);
      }
    } catch (error) {
      console.error("Error removing tag:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim().length >= 2) {
      e.preventDefault();
      addTag(query.trim());
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setQuery("");
    }
  };

  if (tags.length === 0 && !editable) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <TagBadge
          key={tag.id}
          name={tag.name}
          slug={tag.slug}
          color={tag.color}
          removable={editable}
          onRemove={() => removeTag(tag.id)}
        />
      ))}

      {editable && tags.length < maxTags && (
        <div className="relative" ref={dropdownRef}>
          {isAdding ? (
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe un tag..."
                className="text-xs px-2 py-1 rounded-full border"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--background)",
                  color: "var(--foreground)",
                  width: "120px",
                }}
                autoFocus
                disabled={isLoading}
              />

              {suggestions.length > 0 && (
                <div
                  className="absolute top-full left-0 mt-1 w-48 rounded-lg shadow-lg border overflow-hidden z-10"
                  style={{
                    background: "var(--card-bg)",
                    borderColor: "var(--border)",
                  }}
                >
                  {suggestions.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => addTag(tag.name)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span>{tag.name}</span>
                      {tag.usage_count !== undefined && (
                        <span className="ml-auto text-xs" style={{ color: "var(--muted)" }}>
                          {tag.usage_count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                setIsAdding(true);
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
              className="text-xs px-2 py-0.5 rounded-full border border-dashed transition-colors hover:border-solid"
              style={{
                borderColor: "var(--muted)",
                color: "var(--muted)",
              }}
            >
              + Añadir tag
            </button>
          )}
        </div>
      )}
    </div>
  );
}
