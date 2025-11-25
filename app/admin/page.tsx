import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { redirect } from "next/navigation";
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
        <Link
          href="/"
          className="btn"
          style={{ background: "white", border: "1px solid var(--border)" }}
        >
          Back to Site
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
                      <span className="text-xs font-bold uppercase px-2 py-1 rounded bg-red-100 text-red-800 mr-2">
                        {report.content_type}
                      </span>
                      <span className="text-sm font-medium">
                        {report.reason}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
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
            <p className="text-sm text-gray-500">No reports found.</p>
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
                  <div className="text-xs text-gray-500">
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
