import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch summary stats
  const [itemsRes, countersRes, sessionsRes] = await Promise.all([
    supabase.from("items").select("id", { count: "exact", head: true }),
    supabase.from("counters").select("id", { count: "exact", head: true }),
    supabase.from("stock_count_sessions").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    {
      name: "Total Items",
      value: itemsRes.count ?? 0,
      href: "/items",
      color: "bg-blue-500",
    },
    {
      name: "Total Counters",
      value: countersRes.count ?? 0,
      href: "/counters",
      color: "bg-green-500",
    },
    {
      name: "Count Sessions",
      value: sessionsRes.count ?? 0,
      href: "/stock-count",
      color: "bg-purple-500",
    },
  ];

  // Recent sessions
  const { data: recentSessions } = await supabase
    .from("stock_count_sessions")
    .select(
      `
      id,
      business_date,
      status,
      started_at,
      counter:counters(counter_name)
    `
    )
    .order("started_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {user.email}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="card hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.color} text-white`}
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Sessions */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Count Sessions
          </h2>
          <Link
            href="/stock-count"
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            View all
          </Link>
        </div>

        {recentSessions && recentSessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header">Business Date</th>
                  <th className="table-header">Counter</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentSessions.map((session: any) => (
                  <tr key={session.id}>
                    <td className="table-cell font-medium">
                      {session.business_date}
                    </td>
                    <td className="table-cell">
                      {session.counter?.counter_name ?? "—"}
                    </td>
                    <td className="table-cell">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          session.status === "submitted"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {session.status}
                      </span>
                    </td>
                    <td className="table-cell text-gray-500">
                      {new Date(session.started_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-gray-500">
            No count sessions yet.{" "}
            <Link
              href="/stock-count/new"
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              Start your first count
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
