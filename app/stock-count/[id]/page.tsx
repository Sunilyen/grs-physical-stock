"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PhysicalStockEntry, { SKUItem } from "@/components/PhysicalStockEntry";
import type { SessionWithDetails } from "@/lib/types";

export default function StockCountDetailPage({
  params,
}: {
    params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [session, setSession] = useState<SessionWithDetails | null>(null);
  const [mappedItems, setMappedItems] = useState<SKUItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const fetchSession = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("stock_count_sessions")
      .select(
        `
        id,
        business_date,
        status,
        started_at,
        submitted_at,
        counter:counters(*),
        counts:physical_stock_counts(
          id,
          item_id,
          counted_qty,
          entered_at,
          item:items(*)
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      setError("Session not found");
      setLoading(false);
      return;
    }

    const sessionData = data as unknown as SessionWithDetails;
    setSession(sessionData);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    async function fetchMappedItems() {
      if (!session?.counter?.id) {
        setMappedItems([]);
        return;
      }
      const { data } = await supabase
        .from("counter_items")
        .select(
          `
          item_id,
          item:items(*)
        `
        )
        .eq("counter_id", session.counter.id)
        .eq("active", true);
      setMappedItems((data ?? []).map((d: any) => d.item));
    }
    fetchMappedItems();
  }, [session?.counter?.id]);

  async function handleSaveCounts(counts: Record<string, number>) {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const updates = Object.entries(counts).map(([itemId, qty]) => ({
      session_id: id,
      item_id: itemId,
      counted_qty: qty,
    }));

    await supabase.from("physical_stock_counts").delete().eq("session_id", id);

    if (updates.length > 0) {
      const { error } = await supabase
        .from("physical_stock_counts")
        .insert(updates);

      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    }

    setSuccess("Counts saved successfully");
    setSaving(false);
    fetchSession();
  }

  async function handleSubmitCounts(counts: Record<string, number>) {
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const updates = Object.entries(counts).map(([itemId, qty]) => ({
      session_id: id,
      item_id: itemId,
      counted_qty: qty,
    }));

    if (updates.length > 0) {
      await supabase
        .from("physical_stock_counts")
        .delete()
        .eq("session_id", id);
      await supabase.from("physical_stock_counts").insert(updates);
    }

    const { error } = await supabase
      .from("stock_count_sessions")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }

    setSuccess("Session submitted successfully!");
    setSubmitting(false);
    fetchSession();
  }

  async function handleDelete() {
    if (!confirm("Delete this count session? This cannot be undone.")) return;
    await supabase.from("stock_count_sessions").delete().eq("id", id);
    router.push("/stock-count");
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
          onClick={() => router.push("/stock-count")}
          className="btn-secondary mt-4"
        >
          Back to Sessions
        </button>
      </div>
    );
  }

  const isSubmitted = session.status === "submitted";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            onClick={() => router.push("/stock-count")}
            className="mb-2 text-sm text-gray-500 hover:text-gray-700"
          >
            â† Back to Sessions
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {session.counter?.counter_name ?? "Stock Count"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Business Date: {session.business_date} | Status:{" "}
            <span
              className={`font-medium ${
                isSubmitted ? "text-green-600" : "text-yellow-600"
              }`}
            >
              {session.status}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDelete} className="btn-danger">
            Delete
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Stock Entry Component */}
      <div className="card">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Physical Count Entry
          </h2>
          <p className="text-sm text-gray-500">
            Enter the counted quantity for each item
          </p>
        </div>

        {isSubmitted ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500">
              This session has been submitted and is locked.
            </p>
          </div>
        ) : (
          <PhysicalStockEntry
            counterId={session.counter?.id ?? ""}
            counterName={session.counter?.counter_name ?? ""}
            initialItems={mappedItems}
            onSubmit={handleSubmitCounts}
          />
        )}
      </div>
    </div>
  );
}


