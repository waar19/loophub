"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Tooltip from "./Tooltip";

interface Forum {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface MobileMenuProps {
  forums: Forum[];
  threadCounts: Record<string, number>;
}

export default function MobileMenu({ forums, threadCounts }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    console.log("MobileMenu forums:", forums?.length || 0, forums);
  }, [forums]);

  const isActive = (slug: string) => {
    return pathname === `/forum/${slug}`;
  };

  const handleToggle = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsOpen((prev) => {
      const newState = !prev;
      console.log("Menu toggle:", newState);
      return newState;
    });
  };

  const handleClose = () => {
    console.log("Closing menu");
    setIsOpen(false);
  };

  // Close menu on escape key and prevent body scroll when open
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Mobile Menu Button - Visible solo en pantallas < 1024px (móviles y tablets pequeñas) */}
      {/* En pantallas grandes (>= 1024px), el sidebar fijo se muestra automáticamente y este botón se oculta */}
      <button
        onClick={handleToggle}
        className="lg:hidden btn btn-ghost p-2"
        aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
        style={{ minWidth: "auto" }}
        type="button"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Mobile Menu Overlay - Solo visible en pantallas < 1024px */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 lg:hidden"
            onClick={handleClose}
            style={{ 
              top: "var(--header-height)",
              zIndex: 1000,
            }}
            aria-hidden={!isOpen}
          />
          <aside
            id="mobile-menu"
            className="fixed left-0 top-0 bottom-0 w-80 overflow-y-auto lg:hidden"
            role="navigation"
            aria-label="Menú de navegación principal"
            aria-hidden={!isOpen}
            style={{
              top: "var(--header-height)",
              background: "var(--card-bg)",
              borderRight: "1px solid var(--border)",
              boxShadow: "var(--shadow-lg)",
              zIndex: 1001,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="p-6 space-y-1">
              <div className="mb-6">
                <Link
                  href="/"
                  onClick={handleClose}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === "/" ? "" : ""
                  }`}
                  style={
                    pathname === "/"
                      ? {
                          background: "var(--brand-light)",
                          color: "var(--brand-dark)",
                        }
                      : {
                          color: "var(--muted)",
                        }
                  }
                  onMouseEnter={(e) => {
                    if (pathname !== "/") {
                      e.currentTarget.style.background = "var(--card-hover)";
                      e.currentTarget.style.color = "var(--foreground)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (pathname !== "/") {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--muted)";
                    }
                  }}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  Inicio
                </Link>
              </div>

              <div className="mb-4">
                <h3
                  className="px-3 text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: "var(--muted)" }}
                >
                  Foros
                </h3>
                <div className="space-y-1">
                  {forums.length === 0 ? (
                    <p className="px-3 text-sm" style={{ color: "var(--muted)" }}>
                      Cargando foros...
                    </p>
                  ) : (
                    forums.map((forum) => {
                      const active = isActive(forum.slug);
                      const count = threadCounts[forum.id] || 0;
                      return (
                        <Link
                          key={forum.id}
                          href={`/forum/${forum.slug}`}
                          onClick={handleClose}
                          className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                            active ? "" : ""
                          }`}
                          style={
                            active
                              ? {
                                  background: "var(--brand-light)",
                                  color: "var(--brand-dark)",
                                }
                              : {
                                  color: "var(--muted)",
                                }
                          }
                          onMouseEnter={(e) => {
                            if (!active) {
                              e.currentTarget.style.background = "var(--card-hover)";
                              e.currentTarget.style.color = "var(--foreground)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!active) {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "var(--muted)";
                            }
                          }}
                        >
                          <span className="font-medium">{forum.name}</span>
                          {count > 0 && (
                            <Tooltip
                              content={`${count} ${count === 1 ? "hilo" : "hilos"} en este foro`}
                              position="right"
                            >
                              <span
                                className="text-xs px-1.5 py-0.5 rounded"
                                style={{
                                  background: active
                                    ? "var(--brand)"
                                    : "var(--border-light)",
                                  color: active ? "white" : "var(--muted)",
                                }}
                              >
                                {count}
                              </span>
                            </Tooltip>
                          )}
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            </nav>
          </aside>
        </>
      )}
    </>
  );
}

