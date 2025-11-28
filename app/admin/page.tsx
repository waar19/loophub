import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";

import DeleteButton from "@/components/DeleteButton";

export default async function AdminDashboard() {
  await requireAdmin();
  const supabase = await createClient();

  // Fetch recent reports
  const { data: reports } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch recent threads
  const { data: threads } = await supabase
    .from("threads")
    .select("*, profile:profiles(username)")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/analytics"
            className="btn btn-primary"
          >
            📊 Analytics
          </Link>
          <Link
            href="/"
            className="btn"
            style={{
              background: "var(--card-bg)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
            }}
          >
            Back to Site
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickStatCard label="Reports" count={reports?.length || 0} icon="🚨" />
        <QuickStatCard label="Recent Threads" count={threads?.length || 0} icon="📝" />
        <Link href="/admin/moderators" className="contents">
          <div className="card text-center hover:shadow-lg transition-shadow cursor-pointer">
            <span className="text-2xl">🛡️</span>
            <p className="text-sm font-medium mt-1">Moderators</p>
          </div>
        </Link>
        <Link href="/admin/analytics" className="contents">
          <div className="card text-center hover:shadow-lg transition-shadow cursor-pointer">
            <span className="text-2xl">📊</span>
            <p className="text-sm font-medium mt-1">View Analytics</p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Reports Section */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Recent Reports</h2>
          {reports && reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="border-b pb-2 last:border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <span
                        className="text-xs font-bold uppercase px-2 py-1 rounded mr-2"
                        style={{
                          background: "rgba(239, 68, 68, 0.1)",
                          color: "#ef4444",
                        }}
                      >
                        {report.content_type}
                      </span>
                      <span className="text-sm font-medium">
                        {report.reason}
                      </span>
                    </div>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      {new Date(report.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-2 text-xs">
                    Status: <span className="font-medium">{report.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              No reports found.
            </p>
          )}
        </div>

        {/* Recent Threads Section */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Recent Threads</h2>
          <div className="space-y-4">
            {threads?.map((thread) => (
              <div
                key={thread.id}
                className="border-b pb-2 last:border-0 flex justify-between items-center"
              >
                <div>
                  <Link
                    href={`/thread/${thread.id}`}
                    className="font-medium hover:underline block truncate max-w-xs"
                  >
                    {thread.title}
                  </Link>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                    by {thread.profile?.username || "Unknown"} •{" "}
                    {new Date(thread.created_at).toLocaleDateString()}
                  </div>
                </div>
                <DeleteButton id={thread.id} type="thread" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickStatCard({ label, count, icon }: { label: string; count: number; icon: string }) {
  return (
    <div className="card text-center">
      <span className="text-2xl">{icon}</span>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-sm" style={{ color: "var(--muted)" }}>{label}</p>
    </div>
  );
}
