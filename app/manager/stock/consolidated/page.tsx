"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  exportConsolidatedStockToCSV,
  type ConsolidatedStockRow,
} from "@/lib/export/stockExport";

interface CounterInfo {
  id: string;
  counter_name: string;
}

interface ItemInfo {
  id: string;
  item_code: string;
  item_name: string;
  mou: string;
  category: string;
}

interface SessionCount {
  item_id: string;
  counted_qty: number;
  counter_id: string;
}

export default function ConsolidatedStockPage() {
  const [counters, setCounters] = useState<CounterInfo[]>([]);
  const [items, setItems] = useState<ItemInfo[]>([]);
  const [counts, setCounts] = useState<SessionCount[]>([]);
  const [businessDate, setBusinessDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [countersRes, itemsRes, sessionsRes] = await Promise.all([
      supabase.from("counters").select("id, counter_name").eq("active", true).order("counter_code"),
      supabase.from("items").select("id, item_code, item_name, mou, category").eq("active", true).order("item_code"),
      supabase
        .from("stock_count_sessions")
        .select("id, counter_id")
        .eq("business_date", businessDate)
        .eq("status", "submitted"),
    ]);

    if (countersRes.error) {
      setError("Failed to load counters");
      setLoading(false);
      return;
    }
    if (itemsRes.error) {
      setError("Failed to load items");
      setLoading(false);
      return;
    }

    const sessionIds = (sessionsRes.data ?? []).map((s) => s.id);

    let countsData: SessionCount[] = [];
    if (sessionIds.length > 0) {
      const countsRes = await supabase
        .from("physical_stock_counts")
        .select("item_id, counted_qty, session_id")
        .in("session_id", sessionIds);

      if (countsRes.error) {
        setError("Failed to load counts");
        setLoading(false);
        return;
      }

      // Map session_id to counter_id
      const sessionToCounter = new Map(
        (sessionsRes.data ?? []).map((s) => [s.id, s.counter_id])
      );
      countsData = (countsRes.data ?? []).map((c) => ({
        item_id: c.item_id,
        counted_qty: Number(c.counted_qty),
        counter_id: sessionToCounter.get(c.session_id) ?? "",
      }));
    }

    setCounters(countersRes.data ?? []);
    setItems(itemsRes.data ?? []);
    setCounts(countsData);
    setLoading(false);
  }, [businessDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function buildConsolidatedData(): ConsolidatedStockRow[] {
    return items.map((item) => {
      const counterQuantities: Record<string, number> = {};
      let total = 0;

      for (const counter of counters) {
        const count = counts.find(
          (c) => c.item_id === item.id && c.counter_id === counter.id
        );
        const qty = count?.counted_qty ?? 0;
        counterQuantities[counter.counter_name] = qty;
        total += qty;
      }

      return {
        item_code: item.item_code,
        item_name: item.item_name,
        mou: item.mou,
        category: item.category,
        counter_quantities: counterQuantities,
        total_physical_stock: total,
      };
    });
  }

  function handleExport() {
    setExporting(true);
    try {
      const data = buildConsolidatedData();
      const counterNames = counters.map((c) => c.counter_name);
      exportConsolidatedStockToCSV(data, businessDate, counterNames);
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  const consolidatedData = buildConsolidatedData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Consolidated Physical Stock
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manager view — all counters combined
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={businessDate}
            onChange={(e) => setBusinessDate(e.target.value)}
            className="input-field"
          />
          <button
            onClick={handleExport}
            disabled={exporting || consolidatedData.length === 0}
            className="btn-primary"
          >
            {exporting ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Exporting...
              </span>
            ) : (
              "Export to CSV"
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-gray-500">Business Date</p>
          <p className="text-xl font-bold text-gray-900">{businessDate}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total Items</p>
          <p className="text-xl font-bold text-gray-900">{items.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total Physical Stock</p>
          <p className="text-xl font-bold text-gray-900">
            {consolidatedData.reduce((sum, r) => sum + r.total_physical_stock, 0)}
          </p>
        </div>
      </div>

      {/* Consolidated Table */}
      <div className="card overflow-hidden p-0">
        {consolidatedData.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">
              No submitted stock counts for this date.
            </p>
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
                  {counters.map((counter) => (
                    <th key={counter.id} className="table-header text-right">
                      {counter.counter_name}
                    </th>
                  ))}
                  <th className="table-header text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {consolidatedData.map((row) => (
                  <tr key={row.item_code} className="hover:bg-gray-50">
                    <td className="table-cell font-mono text-xs font-medium">
                      {row.item_code}
                    </td>
                    <td className="table-cell font-medium">{row.item_name}</td>
                    <td className="table-cell">{row.mou}</td>
                    <td className="table-cell">
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {row.category}
                      </span>
                    </td>
                    {counters.map((counter) => (
                      <td key={counter.id} className="table-cell text-right">
                        {row.counter_quantities[counter.counter_name] ?? 0}
                      </td>
                    ))}
                    <td className="table-cell text-right font-bold">
                      {row.total_physical_stock}
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
