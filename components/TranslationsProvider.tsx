"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { Locale, translations, defaultLocale, supportedLocales } from "@/lib/i18n/translations";
import { detectBrowserLocale } from "@/lib/i18n/utils";

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & string]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : Key;
}[keyof ObjectType & string];

type TranslationPath = NestedKeyOf<typeof translations.es>;

interface TranslationsContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationPath, params?: Record<string, string | number>) => string;
}

const TranslationsContext = createContext<TranslationsContextType | undefined>(undefined);

export function TranslationsProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Detect browser locale on mount
    const detectedLocale = detectBrowserLocale();
    const savedLocale = localStorage.getItem("locale") as Locale;
    
    const initialLocale = savedLocale && supportedLocales.includes(savedLocale)
      ? savedLocale
      : detectedLocale;

    setLocaleState(initialLocale);
    setMounted(true);
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("locale", newLocale);
    // Update HTML lang attribute
    if (typeof document !== "undefined") {
      document.documentElement.lang = newLocale;
    }
  };

  const getNestedValue = (obj: any, path: string): string => {
    return path.split(".").reduce((current, key) => current?.[key], obj) || path;
  };

  const t = (key: TranslationPath, params?: Record<string, string | number>): string => {
    const translation = getNestedValue(translations[locale], key) || key;
    
    if (!params) return translation;

    // Replace placeholders like {count} with actual values
    return translation.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey]?.toString() || match;
    });
  };

  // Update HTML lang attribute when locale changes
  useEffect(() => {
    if (mounted && typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale, mounted]);

  if (!mounted) {
    // Return default translations during SSR/hydration
    return (
      <TranslationsContext.Provider
        value={{
          locale: defaultLocale,
          setLocale: () => {},
          t: (key: TranslationPath) => getNestedValue(translations[defaultLocale], key) || key,
        }}
      >
        {children}
      </TranslationsContext.Provider>
    );
  }

  return (
    <TranslationsContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </TranslationsContext.Provider>
  );
}

export function useTranslations() {
  const context = useContext(TranslationsContext);
  if (!context) {
    throw new Error("useTranslations must be used within TranslationsProvider");
  }
  return context;
}

