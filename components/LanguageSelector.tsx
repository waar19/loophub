"use client";

import { useTranslations } from "@/components/TranslationsProvider";
import { Locale, supportedLocales } from "@/lib/i18n/translations";
import { useState, useRef, useEffect } from "react";

const localeNames: Record<Locale, string> = {
  es: "Español",
  en: "English",
  pt: "Português",
};

const localeFlags: Record<Locale, string> = {
  es: "🇪🇸",
  en: "🇺🇸",
  pt: "🇧🇷",
};

export default function LanguageSelector() {
  const { locale, setLocale } = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-[var(--card-hover)]"
        aria-label="Select language"
        title="Select language"
      >
        <span className="text-lg">{localeFlags[locale]}</span>
        <span
          className="hidden sm:inline text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          {localeNames[locale]}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ color: "var(--muted)" }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-40 rounded-lg shadow-xl border z-50"
          style={{
            background: "var(--card-bg)",
            borderColor: "var(--border)",
          }}
        >
          <div className="py-2">
            {supportedLocales.map((loc) => (
              <button
                key={loc}
                onClick={() => {
                  setLocale(loc);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                  locale === loc
                    ? "bg-[var(--brand-light)]"
                    : "hover:bg-[var(--card-hover)]"
                }`}
              >
                <span className="text-lg">{localeFlags[loc]}</span>
                <span
                  className="text-sm font-medium"
                  style={{
                    color:
                      locale === loc
                        ? "var(--brand-dark)"
                        : "var(--foreground)",
                  }}
                >
                  {localeNames[loc]}
                </span>
                {locale === loc && (
                  <svg
                    className="w-4 h-4 ml-auto"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    style={{ color: "var(--brand)" }}
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
        </div>
      )}
    </div>
  );
}
