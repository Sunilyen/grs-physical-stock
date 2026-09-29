"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PhysicalStockEntry, { SKUItem } from "@/components/PhysicalStockEntry";

export default function StockCountPage({
  params,
}: {
  params: Promise<{ counterId: string }>;
}) {
  const { counterId } = params;
  const router = useRouter();
  const supabase = createClient();

  const [counterName, setCounterName] = useState("");
  const [items, setItems] = useState<SKUItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Fetch counter name
    const { data: counterData, error: counterError } = await supabase
      .from("counters")
      .select("counter_name")
      .eq("id", counterId)
      .single();

    if (counterError) {
      setError("Counter not found");
      setLoading(false);
      return;
    }

    setCounterName(counterData?.counter_name ?? "");

    // Fetch mapped items
    const { data: mappedData, error: itemsError } = await supabase
      .from("counter_items")
      .select(
        `
        item_id,
        item:items(id, item_code, item_name, mou, category)
      `
      )
      .eq("counter_id", counterId)
      .eq("active", true);

    if (itemsError) {
      setError("Failed to load items");
      setLoading(false);
      return;
    }

    const skuItems: SKUItem[] = (mappedData ?? []).map((row: any) => ({
      id: row.item.id,
      item_code: row.item.item_code,
      item_name: row.item.item_name,
      mou: row.item.mou,
      category: row.item.category,
    }));

    setItems(skuItems);
    setLoading(false);
  }, [counterId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSaveDraft(counts: Record<string, number>) {
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Upsert session
    const { data: session, error: sessionError } = await supabase
      .from("stock_count_sessions")
      .upsert(
        {
          business_date: new Date().toISOString().split("T")[0],
          counter_id: counterId,
          submitted_by: user?.id,
          status: "draft",
        },
        { onConflict: "business_date,counter_id" }
      )
      .select()
      .single();

    if (sessionError) {
      setError(sessionError.message);
      setSaving(false);
      return;
    }

    // Bulk upsert counts
    const countRows = Object.entries(counts).map(([itemId, qty]) => ({
      session_id: session.id,
      item_id: itemId,
      counted_qty: qty,
    }));

    if (countRows.length > 0) {
      const { error: countsError } = await supabase
        .from("physical_stock_counts")
        .upsert(countRows, { onConflict: "session_id,item_id" });

      if (countsError) {
        setError(countsError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
  }

  async function handleSubmit(counts: Record<string, number>) {
    setSubmitting(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Upsert session as submitted
    const { data: session, error: sessionError } = await supabase
      .from("stock_count_sessions")
      .upsert(
        {
          business_date: new Date().toISOString().split("T")[0],
          counter_id: counterId,
          submitted_by: user?.id,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "business_date,counter_id" }
      )
      .select()
      .single();

    if (sessionError) {
      setError(sessionError.message);
      setSubmitting(false);
      return;
    }

    // Bulk upsert counts
    const countRows = Object.entries(counts).map(([itemId, qty]) => ({
      session_id: session.id,
      item_id: itemId,
      counted_qty: qty,
    }));

    if (countRows.length > 0) {
      const { error: countsError } = await supabase
        .from("physical_stock_counts")
        .upsert(countRows, { onConflict: "session_id,item_id" });

      if (countsError) {
        setError(countsError.message);
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    router.push(`/stock/submitted?sessionId=${session.id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Stock Count</h1>
        <p className="mt-1 text-sm text-gray-500">
          End-of-day physical stock counting
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <PhysicalStockEntry
        counterId={counterId}
        counterName={counterName}
        initialItems={items}
        isLoading={loading}
        error={error}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
