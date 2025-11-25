import { Locale, defaultLocale, supportedLocales } from "./translations";

/**
 * Get locale from Accept-Language header or default
 */
export function getLocaleFromHeaders(headers: Headers): Locale {
  const acceptLanguage = headers.get("accept-language");
  
  if (!acceptLanguage) {
    return defaultLocale;
  }

  // Parse Accept-Language header
  // Format: "en-US,en;q=0.9,es;q=0.8"
  const languages = acceptLanguage
    .split(",")
    .map((lang) => {
      const [code, q = "q=1"] = lang.trim().split(";");
      const quality = parseFloat(q.replace("q=", ""));
      return { code: code.split("-")[0].toLowerCase(), quality };
    })
    .sort((a, b) => b.quality - a.quality);

  // Find first supported locale
  for (const lang of languages) {
    if (supportedLocales.includes(lang.code as Locale)) {
      return lang.code as Locale;
    }
  }

  return defaultLocale;
}

/**
 * Get locale from cookie or default
 */
export function getLocaleFromCookie(cookieHeader: string | null): Locale {
  if (!cookieHeader) return defaultLocale;

  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  const locale = cookies["locale"] as Locale;
  return supportedLocales.includes(locale) ? locale : defaultLocale;
}

/**
 * Detect locale from browser (client-side)
 */
export function detectBrowserLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;

  const browserLang = navigator.language.split("-")[0].toLowerCase();
  return supportedLocales.includes(browserLang as Locale)
    ? (browserLang as Locale)
    : defaultLocale;
}

