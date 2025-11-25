export default function Footer() {
  return (
    <footer
      className="border-t mt-auto"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--border)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:pl-[calc(var(--sidebar-width)+1.5rem)] py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>
              LoopHub
            </p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Minimalismo Digital • Organización Personal • Productividad Realista
            </p>
          </div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            © {new Date().getFullYear()} LoopHub. Todos los derechos reservados.
          </div>
        </div>
      </div>
    </footer>
  );
}

