"use client";

import React, { useState, useEffect, useMemo } from "react";

export interface SKUItem {
  id: string;
  item_code: string;
  item_name: string;
  mou: string;
  category: string;
}

interface PhysicalStockEntryProps {
  counterId: string;
  counterName: string;
  initialItems?: SKUItem[];
  isLoading?: boolean;
  error?: string | null;
  onSubmit: (counts: Record<string, number>) => void;
}

export default function PhysicalStockEntry({
  counterId,
  counterName,
  initialItems = [],
  isLoading = false,
  error = null,
  onSubmit,
}: PhysicalStockEntryProps) {
  // ---------------------------------------------------------------------------
  // 1. ALL HOOKS MUST BE DECLARED FIRST (BEFORE ANY CONDITIONAL RETURNS)
  // ---------------------------------------------------------------------------

  // Hook 1: Local state for item counts
  const [counts, setCounts] = useState<Record<string, string>>({});

  // Hook 2: Local state for mapped/filtered SKU items
  const [mappedItems, setMappedItems] = useState<SKUItem[]>([]);

  // Hook 3: Search filter query
  const [searchQuery, setSearchQuery] = useState("");

  // Hook 4: useEffect to populate mappedItems when initialItems changes
  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setMappedItems(initialItems);

      // Initialize uncounted state as empty strings (null/uncounted state)
      const initialCounts: Record<string, string> = {};
      initialItems.forEach((item) => {
        initialCounts[item.id] = "";
      });
      setCounts(initialCounts);
    }
  }, [initialItems]);

  // Hook 5: useMemo for filtered item list based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return mappedItems;
    const q = searchQuery.toLowerCase();
    return mappedItems.filter(
      (item) =>
        item.item_name.toLowerCase().includes(q) ||
        item.item_code.toLowerCase().includes(q)
    );
  }, [mappedItems, searchQuery]);

  // Hook 6: Calculate progress count
  const countedCount = useMemo(() => {
    return Object.values(counts).filter((val) => val !== "").length;
  }, [counts]);

  // ---------------------------------------------------------------------------
  // 2. EVENT HANDLERS & HELPER FUNCTIONS
  // ---------------------------------------------------------------------------

  const handleInputChange = (itemId: string, value: string) => {
    // Only accept whole positive numbers or empty string
    if (value === "" || /^\d+$/.test(value)) {
      setCounts((prev) => ({
        ...prev,
        [itemId]: value,
      }));
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentIndex: number
  ) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const nextInput = document.getElementById(
        `stock-input-${currentIndex + 1}`
      );
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (countedCount < mappedItems.length) return;

    // Convert string entries into numeric values
    const finalCounts: Record<string, number> = {};
    Object.entries(counts).forEach(([itemId, val]) => {
      finalCounts[itemId] = Number(val);
    });

    onSubmit(finalCounts);
  };

  // ---------------------------------------------------------------------------
  // 3. CONDITIONAL EARLY RETURNS (ALLOWED ONLY AFTER ALL HOOKS ARE DECLARED)
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 font-medium">Loading counter items...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
        <p className="font-semibold">Failed to load items</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!mappedItems || mappedItems.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        No SKUs mapped to counter: <span className="font-semibold">{counterName}</span>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 4. MAIN JSX RENDER
  // ---------------------------------------------------------------------------

  const isComplete = countedCount === mappedItems.length;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* Header & Progress Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">{counterName}</h1>
        <p className="text-sm text-gray-500">End-of-Day Physical Stock Count</p>

        <div className="mt-3 flex items-center justify-between text-sm font-medium text-gray-700">
          <span>Progress</span>
          <span>
            {countedCount} / {mappedItems.length} Items Counted
          </span>
        </div>
        <div className="w-full bg-gray-200 h-2.5 rounded-full mt-1 overflow-hidden">
          <div
            className="bg-blue-600 h-2.5 transition-all duration-300"
            style={{
              width: `${(countedCount / mappedItems.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by Item Code or Name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Item List Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-100">
          {filteredItems.map((item, idx) => {
            const val = counts[item.id] ?? "";
            const isFilled = val !== "";

            return (
              <div
                key={item.id}
                className={`p-3 flex items-center justify-between gap-4 transition-colors ${
                  isFilled ? "bg-gray-50/50" : "bg-white"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                      {item.item_code}
                    </span>
                    <span className="text-xs text-gray-400">({item.mou})</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate mt-0.5">
                    {item.item_name}
                  </p>
                </div>

                {/* Input Entry Box */}
                <div className="w-24">
                  <input
                    id={`stock-input-${idx}`}
                    type="number"
                    inputMode="numeric"
                    placeholder="Count"
                    value={val}
                    onChange={(e) => handleInputChange(item.id, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    className={`w-full h-11 text-center font-bold text-lg rounded-md border focus:ring-2 focus:outline-none transition-all ${
                      isFilled
                        ? "border-blue-500 bg-blue-50/20 text-blue-900"
                        : "border-gray-300 bg-white text-gray-900 focus:ring-blue-500"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isComplete}
          className={`w-full py-3.5 px-4 rounded-lg text-white font-semibold text-base transition-all shadow-sm ${
            isComplete
              ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 cursor-pointer"
              : "bg-gray-300 cursor-not-allowed opacity-70"
          }`}
        >
          {isComplete
            ? "Review & Submit Stock Count"
            : `Complete All Items (${countedCount}/${mappedItems.length})`}
        </button>
      </form>
    </div>
  );
}
