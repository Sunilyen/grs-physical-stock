"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { StockCountSession } from "@/lib/types";

export default function StockCountPage() {
  const [sessions, setSessions] = useState<StockCountSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");
  const supabase = createClient();

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("stock_count_sessions")
      .select(
        `
        id,
        business_date,
        status,
        started_at,
        submitted_at,
        counter:counters(counter_name, counter_code)
      `
      )
      .order("started_at", { ascending: false });

    if (filterStatus !== "all") {
      query = query.eq("status", filterStatus);
    }
    if (filterDate) {
      query = query.eq("business_date", filterDate);
    }

    const { data } = await query;
    setSessions((data as any) ?? []);
    setLoading(false);
  }, [filterStatus, filterDate]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const filteredSessions = sessions.filter((s) => {
    const counterName = (s.counter as any)?.counter_name ?? "";
    return counterName.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Stock Count Sessions
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            End-of-day physical stock counting
          </p>
        </div>
        <Link href="/stock-count/new" className="btn-primary">
          + New Count Session
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Search by counter name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field sm:max-w-xs"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input-field sm:max-w-[160px]"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="input-field sm:max-w-[180px]"
        />
        {(filterStatus !== "all" || filterDate) && (
          <button
            onClick={() => {
              setFilterStatus("all");
              setFilterDate("");
            }}
            className="btn-secondary"
          >
            Clear
          </button>
        )}
      </div>

      {/* Sessions Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">No sessions found.</p>
            <Link
              href="/stock-count/new"
              className="mt-2 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Create your first count session
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Business Date</th>
                  <th className="table-header">Counter</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Started</th>
                  <th className="table-header">Submitted</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">
                      {session.business_date}
                    </td>
                    <td className="table-cell">
                      {(session.counter as any)?.counter_name ?? "—"}
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
                    <td className="table-cell text-gray-500">
                      {session.submitted_at
                        ? new Date(session.submitted_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="table-cell">
                      <div className="flex justify-end">
                        <Link
                          href={`/stock-count/${session.id}`}
                          className="rounded-lg px-3 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50"
                        >
                          {session.status === "draft" ? "Continue" : "View"}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
