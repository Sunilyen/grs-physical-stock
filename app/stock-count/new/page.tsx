"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Counter } from "@/lib/types";

export default function NewStockCountPage() {
  const [counters, setCounters] = useState<Counter[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedCounterId, setSelectedCounterId] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchCounters() {
      const { data } = await supabase
        .from("counters")
        .select("*")
        .eq("active", true)
        .order("counter_code");
      setCounters(data ?? []);
      setLoading(false);
    }
    fetchCounters();
  }, []);

  async function handleCreate() {
    if (!selectedCounterId) {
      setError("Please select a counter");
      return;
    }

    setCreating(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("stock_count_sessions")
      .insert({
        business_date: selectedDate,
        counter_id: selectedCounterId,
        submitted_by: user?.id,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        setError(
          "A session already exists for this date and counter. Please select a different date or counter."
        );
      } else {
        setError(error.message);
      }
      setCreating(false);
      return;
    }

    router.push(`/stock-count/${data.id}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          New Stock Count Session
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Set up a new end-of-day physical count
        </p>
      </div>

      <div className="card space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Business Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Counter
          </label>
          <select
            value={selectedCounterId}
            onChange={(e) => setSelectedCounterId(e.target.value)}
            className="input-field"
          >
            <option value="">Select a counter...</option>
            {counters.map((counter) => (
              <option key={counter.id} value={counter.id}>
                {counter.counter_code} — {counter.counter_name}
              </option>
            ))}
          </select>
        </div>

        {counters.length === 0 && (
          <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700">
            No active counters found. Please create counters first.
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={() => router.push("/stock-count")}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !selectedCounterId}
            className="btn-primary"
          >
            {creating ? "Creating..." : "Create Session"}
          </button>
        </div>
      </div>
    </div>
  );
}
