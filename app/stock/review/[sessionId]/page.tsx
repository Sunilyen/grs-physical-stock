"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface CountItem {
  id: string;
  item_id: string;
  counted_qty: number;
  item: {
    id: string;
    item_code: string;
    item_name: string;
    mou: string;
    category: string;
  };
}

interface SessionData {
  id: string;
  business_date: string;
  status: string;
  submitted_at: string | null;
  started_at: string;
  counter: {
    id: string;
    counter_name: string;
    counter_code: string;
  };
  counts: CountItem[];
}

export default function StockReviewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = params;
  const router = useRouter();
  const supabase = createClient();

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSession = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("stock_count_sessions")
      .select(
        `
        id,
        business_date,
        status,
        submitted_at,
        started_at,
        counter:counters(id, counter_name, counter_code),
        counts:physical_stock_counts(
          id,
          item_id,
          counted_qty,
          item:items(id, item_code, item_name, mou, category)
        )
      `
      )
      .eq("id", sessionId)
      .single();

    if (error) {
      setError("Session not found");
      setLoading(false);
      return;
    }

    setSession(data as unknown as SessionData);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const filteredCounts = useMemo(() => {
    if (!session?.counts) return [];
    if (!searchQuery.trim()) return session.counts;
    const q = searchQuery.toLowerCase();
    return session.counts.filter(
      (c) =>
        c.item.item_name.toLowerCase().includes(q) ||
        c.item.item_code.toLowerCase().includes(q)
    );
  }, [session?.counts, searchQuery]);

  const totalUnits = useMemo(() => {
    return filteredCounts.reduce((sum, c) => sum + Number(c.counted_qty), 0);
  }, [filteredCounts]);

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="card text-center">
        <p className="text-gray-500">Session not found.</p>
        <button
          onClick={() => router.push("/stock/today")}
          className="btn-secondary mt-4"
        >
          Back to Counter Selection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            onClick={() => router.push("/stock/today")}
            className="mb-2 text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to Counter Selection
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {session.counter?.counter_name ?? "Stock Count Review"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span>Business Date: {session.business_date}</span>
            <span>•</span>
            <span>
              Submitted:{" "}
              {session.submitted_at
                ? new Date(session.submitted_at).toLocaleString()
                : "—"}
            </span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                session.status === "submitted"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {session.status}
            </span>
          </div>
        </div>
        <button onClick={handlePrint} className="btn-secondary">
          Print / Export Summary
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card">
          <p className="text-sm text-gray-500">Total SKUs Counted</p>
          <p className="text-2xl font-bold text-gray-900">
            {filteredCounts.length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total Physical Units Counted</p>
          <p className="text-2xl font-bold text-gray-900">{totalUnits}</p>
        </div>
      </div>

      {/* Search Filter */}
      <input
        type="text"
        placeholder="Filter by item code or name..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="input-field"
      />

      {/* Items Table */}
      <div className="card overflow-hidden p-0">
        {filteredCounts.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">No items found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Item Code</th>
                  <th className="table-header">Item Name</th>
                  <th className="table-header">MOU</th>
                  <th className="table-header">Category</th>
                  <th className="table-header text-right">Counted Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCounts.map((count) => (
                  <tr key={count.id} className="hover:bg-gray-50">
                    <td className="table-cell font-mono text-xs font-medium">
                      {count.item.item_code}
                    </td>
                    <td className="table-cell font-medium">
                      {count.item.item_name}
                    </td>
                    <td className="table-cell">{count.item.mou}</td>
                    <td className="table-cell">
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {count.item.category}
                      </span>
                    </td>
                    <td className="table-cell text-right font-bold">
                      {Number(count.counted_qty)}
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
