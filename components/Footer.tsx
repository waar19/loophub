"use client";

import { useTranslations } from "./TranslationsProvider";

export default function Footer() {
  const { t } = useTranslations();
  
  return (
    <footer
      className="border-t mt-auto"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--border)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:pl-[calc(var(--sidebar-width)+1.5rem)] py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>
              LoopHub
            </p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              {t("footer.tagline")}
            </p>
          </div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            © {new Date().getFullYear()} LoopHub. {t("footer.rights")}
          </div>
        </div>
      </div>
    </footer>
  );
}

