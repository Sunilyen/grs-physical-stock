"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface CounterStatus {
  counter_id: string;
  counter_name: string;
  location_zone: string;
  status: "submitted" | "draft" | "pending";
  total_items_counted: number;
  total_monetary_value: number;
  submitted_at: string | null;
}

type FilterTab = "all" | "submitted" | "draft" | "pending";

export default function ManagerDashboard() {
  const supabase = createClient();

  const [counters, setCounters] = useState<CounterStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("v_daily_counter_submission_status")
      .select("*");

    if (error) {
      setError("Failed to load dashboard data");
      setLoading(false);
      return;
    }

    setCounters((data as CounterStatus[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => {
    const total = 23;
    const submitted = counters.filter((c) => c.status === "submitted").length;
    const draft = counters.filter((c) => c.status === "draft").length;
    const pending = counters.filter((c) => c.status === "pending").length;
    const completionPct = total > 0 ? Math.round((submitted / total) * 100) : 0;
    return { total, submitted, draft, pending, completionPct };
  }, [counters]);

  const filteredCounters = useMemo(() => {
    let result = counters;

    // Filter by tab
    if (activeTab !== "all") {
      result = result.filter((c) => c.status === activeTab);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.counter_name.toLowerCase().includes(q) ||
          c.location_zone.toLowerCase().includes(q) ||
          c.counter_id.toLowerCase().includes(q)
      );
    }

    return result;
  }, [counters, activeTab, searchQuery]);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "submitted", label: "Submitted" },
    { key: "draft", label: "Draft" },
    { key: "pending", label: "Pending" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-gray-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Manager Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Daily counter submission status â€”{" "}
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Total Counters
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {stats.total}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-green-600">
            Submitted
          </p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {stats.submitted}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-yellow-600">
            In Draft
          </p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">
            {stats.draft}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
            Pending
          </p>
          <p className="text-3xl font-bold text-red-600 mt-1">
            {stats.pending}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
          <span>Completion Progress</span>
          <span>{stats.completionPct}%</span>
        </div>
        <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
          <div
            className="bg-green-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${stats.completionPct}%` }}
          />
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by counter name, zone, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Counters Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Counter
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Zone
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Items Counted
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Total Value
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Submitted At
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCounters.map((counter) => (
                <tr key={counter.counter_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">
                      {counter.counter_name}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">
                      {counter.counter_id}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {counter.location_zone}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        counter.status === "submitted"
                          ? "bg-green-100 text-green-700"
                          : counter.status === "draft"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {counter.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    {counter.total_items_counted}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    ${counter.total_monetary_value?.toFixed(2) ?? "0.00"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">
                    {counter.submitted_at
                      ? new Date(counter.submitted_at).toLocaleTimeString()
                      : "â€”"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

