import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length <= 1) return null;

  return (
    <nav
      className="flex items-center gap-1.5 mb-3"
      aria-label="Breadcrumb"
      style={{ fontSize: "0.75rem" }}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <div key={index} className="flex items-center gap-1">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="transition-colors"
                style={{ color: "var(--muted)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--brand)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--muted)";
                }}
              >
                {item.label}
              </Link>
            ) : (
              <span
                style={{
                  color: isLast ? "var(--foreground)" : "var(--muted)",
                  fontWeight: isLast ? 500 : 400,
                }}
              >
                {item.label}
              </span>
            )}
            {!isLast && (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: "var(--muted)" }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
          </div>
        );
      })}
    </nav>
  );
}

