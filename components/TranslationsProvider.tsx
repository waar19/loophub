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
    
    // Also check cookie for SSR consistency
    const cookieLocale = document.cookie
      .split('; ')
      .find(row => row.startsWith('locale='))
      ?.split('=')[1] as Locale;
    
    const initialLocale = savedLocale && supportedLocales.includes(savedLocale)
      ? savedLocale
      : cookieLocale && supportedLocales.includes(cookieLocale)
      ? cookieLocale
      : detectedLocale;

    setLocaleState(initialLocale);
    // Sync cookie with localStorage
    document.cookie = `locale=${initialLocale}; path=/; max-age=31536000`;
    setMounted(true);
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("locale", newLocale);
    // Also set as cookie for server-side reading
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000`;
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
    // Fallback for SSR edge cases - return default translations
    const getNestedValue = (obj: any, path: string): string => {
      return path.split(".").reduce((current, key) => current?.[key], obj) || path;
    };
    return {
      locale: defaultLocale,
      setLocale: () => {},
      t: (key: TranslationPath, params?: Record<string, string | number>) => {
        const translation = getNestedValue(translations[defaultLocale], key) || key;
        if (!params) return translation;
        return translation.replace(/\{(\w+)\}/g, (match, paramKey) => {
          return params[paramKey]?.toString() || match;
        });
      },
    };
  }
  return context;
}

