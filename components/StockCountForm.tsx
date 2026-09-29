"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface StockCountFormProps {
  counterId: string;
  counterName: string;
}

interface Item {
  id: string;
  item_code: string;
  item_name: string;
  category: string;
  mou: string;
  unit_price: number;
}

interface CountEntry {
  item_id: string;
  counted_qty: number;
}

interface Session {
  id: string;
  status: "draft" | "submitted";
  submitted_at: string | null;
}

export default function StockCountForm({
  counterId,
  counterName,
}: StockCountFormProps) {
  const supabase = createClient();

  const [items, setItems] = useState<Item[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isSubmitted = session?.status === "submitted";

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Fetch counter name if not provided
    if (!counterName) {
      const { data: counterData } = await supabase
        .from("counters")
        .select("counter_name")
        .eq("id", counterId)
        .single();
      if (counterData) {
        // We don't have a setter for counterName since it's a prop,
        // but we can use it locally
      }
    }

    // Fetch active items for this counter
    const { data: mappedItems, error: itemsError } = await supabase
      .from("counter_items")
      .select(
        `
        item_id,
        item:items(id, item_code, item_name, category, mou, unit_price)
      `
      )
      .eq("counter_id", counterId)
      .eq("active", true);

    if (itemsError) {
      setError("Failed to load items");
      setLoading(false);
      return;
    }

    const itemList: Item[] = (mappedItems ?? []).map((row: any) => ({
      id: row.item.id,
      item_code: row.item.item_code,
      item_name: row.item.item_name,
      category: row.item.category,
      mou: row.item.mou,
      unit_price: row.item.unit_price,
    }));

    setItems(itemList);

    // Fetch or create today's session
    const today = new Date().toISOString().split("T")[0];
    const { data: sessionData, error: sessionError } = await supabase
      .from("stock_count_sessions")
      .select("id, status, submitted_at")
      .eq("counter_id", counterId)
      .eq("business_date", today)
      .single();

    if (sessionError && sessionError.code !== "PGRST116") {
      setError("Failed to load session");
      setLoading(false);
      return;
    }

    let currentSession: Session;

    if (sessionData) {
      currentSession = {
        id: sessionData.id,
        status: sessionData.status,
        submitted_at: sessionData.submitted_at,
      };
    } else {
      // Create new draft session
      const { data: newSession, error: createError } = await supabase
        .from("stock_count_sessions")
        .insert({
          business_date: today,
          counter_id: counterId,
          status: "draft",
        })
        .select("id, status, submitted_at")
        .single();

      if (createError) {
        setError("Failed to create session");
        setLoading(false);
        return;
      }

      currentSession = {
        id: newSession.id,
        status: newSession.status,
        submitted_at: newSession.submitted_at,
      };
    }

    setSession(currentSession);

    // Fetch existing counts
    const { data: countsData, error: countsError } = await supabase
      .from("physical_stock_counts")
      .select("item_id, counted_qty")
      .eq("session_id", currentSession.id);

    if (countsError) {
      setError("Failed to load counts");
      setLoading(false);
      return;
    }

    const countMap: Record<string, string> = {};
    (countsData ?? []).forEach((c: CountEntry) => {
      countMap[c.item_id] = c.counted_qty.toString();
    });

    // Initialize empty counts for items without entries
    itemList.forEach((item) => {
      if (!(item.id in countMap)) {
        countMap[item.id] = "";
      }
    });

    setCounts(countMap);
    setLoading(false);
  }, [counterId, counterName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleCountChange(itemId: string, value: string) {
    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
      setCounts((prev) => ({ ...prev, [itemId]: value }));
    }
  }

  async function handleSaveDraft() {
    if (!session) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const countRows = Object.entries(counts)
      .filter(([, qty]) => qty !== "")
      .map(([itemId, qty]) => ({
        session_id: session.id,
        item_id: itemId,
        counted_qty: parseFloat(qty),
      }));

    // Delete existing counts
    await supabase
      .from("physical_stock_counts")
      .delete()
      .eq("session_id", session.id);

    // Insert new counts
    if (countRows.length > 0) {
      const { error } = await supabase
        .from("physical_stock_counts")
        .insert(countRows);

      if (error) {
        setError("Failed to save draft: " + error.message);
        setSaving(false);
        return;
      }
    }

    setSuccess("Draft saved successfully");
    setSaving(false);
  }

  async function handleSubmit() {
    if (!session) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    // First save counts
    const countRows = Object.entries(counts)
      .filter(([, qty]) => qty !== "")
      .map(([itemId, qty]) => ({
        session_id: session.id,
        item_id: itemId,
        counted_qty: parseFloat(qty),
      }));

    await supabase
      .from("physical_stock_counts")
      .delete()
      .eq("session_id", session.id);

    if (countRows.length > 0) {
      const { error } = await supabase
        .from("physical_stock_counts")
        .insert(countRows);

      if (error) {
        setError("Failed to save counts: " + error.message);
        setSubmitting(false);
        return;
      }
    }

    // Call RPC to submit session
    const { error: rpcError } = await supabase.rpc(
      "submit_stock_count_session",
      {
        p_session_id: session.id,
      }
    );

    if (rpcError) {
      setError("Failed to submit: " + rpcError.message);
      setSubmitting(false);
      return;
    }

    setSuccess("Stock count submitted and locked successfully!");
    setSubmitting(false);

    // Refresh session data
    await fetchData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-gray-500 font-medium">Loading stock count...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{counterName}</h1>
            <p className="text-sm text-gray-500 mt-1">
              End-of-Day Physical Stock Count
            </p>
          </div>
          {isSubmitted && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Submitted
            </span>
          )}
        </div>

        {session?.submitted_at && (
          <p className="text-xs text-gray-400 mt-2">
            Submitted at: {new Date(session.submitted_at).toLocaleString()}
          </p>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <div>
            <p className="font-semibold text-red-800">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="font-semibold text-green-800">Success</p>
            <p className="text-sm text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Items Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Item Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Unit
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Counted Qty
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => {
                const value = counts[item.id] ?? "";
                const isFilled = value !== "";

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isFilled ? "bg-blue-50/30" : "bg-white"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                        {item.item_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {item.item_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.mou}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={value}
                          onChange={(e) =>
                            handleCountChange(item.id, e.target.value)
                          }
                          disabled={isSubmitted}
                          placeholder="0.00"
                          className={`w-28 h-10 text-center text-sm font-semibold rounded-lg border focus:ring-2 focus:outline-none transition-all ${
                            isSubmitted
                              ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                              : isFilled
                                ? "border-blue-500 bg-blue-50/30 text-blue-900 focus:ring-blue-500"
                                : "border-gray-300 bg-white text-gray-900 focus:ring-blue-500"
                          }`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      {!isSubmitted && (
        <div className="flex gap-3">
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="flex-1 py-3 px-4 rounded-lg border border-gray-300 bg-white text-gray-700 font-semibold text-sm transition-all hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-3 px-4 rounded-lg bg-blue-600 text-white font-semibold text-sm transition-all hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit & Lock Counts"}
          </button>
        </div>
      )}
    </div>
  );
}

