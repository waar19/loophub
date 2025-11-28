"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  level: number;
}

interface MentionAutocompleteProps {
  query: string;
  position: { top: number; left: number };
  onSelect: (username: string) => void;
  onClose: () => void;
}

export function MentionAutocomplete({
  query,
  position,
  onSelect,
  onClose,
}: MentionAutocompleteProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch users matching the query
  useEffect(() => {
    // Allow empty query to show a hint, but don't fetch until query has at least 1 char
    if (query.length < 1) {
      setUsers([]);
      setIsLoading(false);
      return;
    }

    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/users/search?q=${encodeURIComponent(query)}&limit=5`,
          { credentials: 'include' }
        );
        if (response.ok) {
          const data = await response.json();
          setUsers(Array.isArray(data) ? data : []);
          setSelectedIndex(0);
        } else {
          console.error("Error fetching users:", response.status, await response.text());
          setUsers([]);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchUsers, 150);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (users.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % users.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + users.length) % users.length);
          break;
        case "Enter":
        case "Tab":
          e.preventDefault();
          if (users[selectedIndex]) {
            onSelect(users[selectedIndex].username);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [users, selectedIndex, onSelect, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (users.length === 0 && !isLoading && query.length > 0) return null;

  // Show hint when query is empty
  const showHint = query.length === 0 && users.length === 0 && !isLoading;

  const levelColors: Record<number, string> = {
    1: "#9CA3AF", // Novato - gray
    2: "#22C55E", // Activo - green
    3: "#3B82F6", // Contribuidor - blue
    4: "#A855F7", // Experto - purple
    5: "#F59E0B", // Veterano - amber
    6: "#EF4444", // Leyenda - red
  };

  return (
    <div
      ref={containerRef}
      className="absolute z-50 w-64 rounded-lg shadow-lg border overflow-hidden"
      style={{
        top: position.top,
        left: position.left,
        background: "var(--card-bg)",
        borderColor: "var(--border)",
      }}
    >
      {showHint ? (
        <div className="p-3" style={{ color: "var(--muted)" }}>
          <p className="text-sm">Type a username to mention...</p>
        </div>
      ) : isLoading ? (
        <div className="p-3 text-center" style={{ color: "var(--muted)" }}>
          <span className="animate-pulse">Searching...</span>
        </div>
      ) : (
        <ul className="max-h-48 overflow-y-auto">
          {users.map((user, index) => (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => onSelect(user.username)}
                className="w-full px-3 py-2 flex items-center gap-3 transition-colors"
                style={{
                  background:
                    index === selectedIndex ? "var(--border)" : "transparent",
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{
                    background: user.avatar_url
                      ? `url(${user.avatar_url}) center/cover`
                      : levelColors[user.level] || "#6B7280",
                  }}
                >
                  {!user.avatar_url && user.username[0].toUpperCase()}
                </div>

                {/* User info */}
                <div className="flex-1 text-left min-w-0">
                  <div
                    className="font-medium truncate"
                    style={{ color: "var(--foreground)" }}
                  >
                    @{user.username}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: levelColors[user.level] || "var(--muted)" }}
                  >
                    Level {user.level}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div
        className="px-3 py-1.5 text-xs border-t"
        style={{ borderColor: "var(--border)", color: "var(--muted)" }}
      >
        <kbd className="px-1 rounded" style={{ background: "var(--border)" }}>
          ↑↓
        </kbd>{" "}
        navigate{" "}
        <kbd className="px-1 rounded" style={{ background: "var(--border)" }}>
          Tab
        </kbd>{" "}
        select{" "}
        <kbd className="px-1 rounded" style={{ background: "var(--border)" }}>
          Esc
        </kbd>{" "}
        close
      </div>
    </div>
  );
}

// Hook to manage mention autocomplete state
export function useMentionAutocomplete(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [triggerIndex, setTriggerIndex] = useState<number | null>(null);

  const checkForMention = useCallback(
    (text: string, cursorPos: number) => {
      // Find the last @ before cursor
      const textBeforeCursor = text.slice(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex === -1) {
        setIsOpen(false);
        return;
      }

      // Check if @ is at start or after whitespace/newline
      const charBefore = lastAtIndex > 0 ? text[lastAtIndex - 1] : " ";
      if (!/[\s\n]/.test(charBefore) && lastAtIndex !== 0) {
        setIsOpen(false);
        return;
      }

      // Get the query after @
      const queryText = textBeforeCursor.slice(lastAtIndex + 1);

      // Check if query contains spaces (completed mention) or is too long
      if (queryText.includes(" ") || queryText.length > 20) {
        setIsOpen(false);
        return;
      }

      // Only alphanumeric and underscores
      if (!/^[a-zA-Z0-9_]*$/.test(queryText)) {
        setIsOpen(false);
        return;
      }

      // Calculate position for the dropdown
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        const style = window.getComputedStyle(textarea);
        const lineHeight = parseInt(style.lineHeight) || 20;
        const paddingTop = parseInt(style.paddingTop) || 8;
        const paddingLeft = parseInt(style.paddingLeft) || 8;

        // Simple approximation - place below current line
        const lines = textBeforeCursor.split("\n");
        const currentLineIndex = lines.length - 1;
        
        // Position dropdown below the current line
        const calculatedTop = paddingTop + lineHeight * (currentLineIndex + 1) + 4;

        setPosition({
          top: Math.max(calculatedTop, 30), // Ensure minimum top position
          left: paddingLeft,
        });
      }

      setQuery(queryText);
      setTriggerIndex(lastAtIndex);
      setIsOpen(true);
    },
    [textareaRef]
  );

  const insertMention = useCallback(
    (username: string, value: string, onChange: (v: string) => void) => {
      if (triggerIndex === null || !textareaRef.current) return;

      const textarea = textareaRef.current;
      const cursorPos = textarea.selectionStart;

      // Replace @query with @username
      const newValue =
        value.slice(0, triggerIndex) +
        `@${username} ` +
        value.slice(cursorPos);

      onChange(newValue);

      // Move cursor after the mention
      const newCursorPos = triggerIndex + username.length + 2; // @ + username + space
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);

      setIsOpen(false);
      setQuery("");
      setTriggerIndex(null);
    },
    [triggerIndex, textareaRef]
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setTriggerIndex(null);
  }, []);

  return {
    isOpen,
    query,
    position,
    checkForMention,
    insertMention,
    close,
  };
}
