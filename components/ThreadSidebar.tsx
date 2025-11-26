import Link from "next/link";
import { Thread, Forum } from "@/lib/supabase";

interface ThreadSidebarProps {
  thread: Thread & { forum: Forum };
}

export default function ThreadSidebar({ thread }: ThreadSidebarProps) {
  const date = new Date(thread.created_at).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <aside className="hidden xl:block w-80 shrink-0">
      <div className="sticky top-24 space-y-3">
        {/* Thread Info Card */}
        <div className="card p-4">
          <h3
            className="text-xs font-semibold mb-3 uppercase tracking-wider"
            style={{ color: "var(--muted)" }}
          >
            Información del Hilo
          </h3>
          <div className="space-y-2.5">
            {/* Author */}
            {thread.profile?.username && (
              <div>
                <p
                  className="text-xs font-medium mb-1.5"
                  style={{ color: "var(--muted)" }}
                >
                  Autor
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                    style={{
                      background: "var(--brand)",
                      color: "white",
                    }}
                  >
                    {thread.profile.username.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {thread.profile.username}
                  </span>
                </div>
              </div>
            )}

            {/* Forum */}
            <div>
              <p
                className="text-xs font-medium mb-1.5"
                style={{ color: "var(--muted)" }}
              >
                Foro
              </p>
              <Link
                href={`/forum/${thread.forum.slug}`}
                className="inline-block"
              >
                <span
                  className="badge text-xs font-semibold px-2 py-0.5"
                  style={{
                    background: "var(--brand)",
                    color: "white",
                  }}
                >
                  {thread.forum.name}
                </span>
              </Link>
            </div>

            {/* Date */}
            <div>
              <p
                className="text-xs font-medium mb-1.5"
                style={{ color: "var(--muted)" }}
              >
                Publicado
              </p>
              <p className="text-xs" style={{ color: "var(--foreground)" }}>
                {date}
              </p>
            </div>

            {/* Comment count */}
            {thread._count && (
              <div>
                <p
                  className="text-xs font-medium mb-1.5"
                  style={{ color: "var(--muted)" }}
                >
                  Comentarios
                </p>
                <p className="text-xs" style={{ color: "var(--foreground)" }}>
                  {thread._count.comments || 0}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Related Links */}
        <div className="card p-4">
          <h3
            className="text-xs font-semibold mb-3 uppercase tracking-wider"
            style={{ color: "var(--muted)" }}
          >
            Enlaces Relacionados
          </h3>
          <div className="space-y-1.5">
            <Link
              href={`/forum/${thread.forum.slug}`}
              className="block text-xs transition-colors"
              style={{ color: "var(--muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--brand)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--muted)";
              }}
            >
              Ver todos los hilos de {thread.forum.name}
            </Link>
            <Link
              href={`/forum/${thread.forum.slug}/new`}
              className="block text-xs transition-colors"
              style={{ color: "var(--muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--brand)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--muted)";
              }}
            >
              Crear nuevo hilo
            </Link>
          </div>
        </div>

        {/* Forum Rules */}
        <div className="card p-4">
          <h3
            className="text-xs font-semibold mb-3 uppercase tracking-wider"
            style={{ color: "var(--muted)" }}
          >
            Reglas del Foro
          </h3>
          <ul className="space-y-1.5 text-xs" style={{ color: "var(--muted)" }}>
            <li>• Mantén las discusiones respetuosas</li>
            <li>• Busca antes de crear duplicados</li>
            <li>• Usa títulos descriptivos</li>
          </ul>
        </div>
      </div>
    </aside>
  );
}

