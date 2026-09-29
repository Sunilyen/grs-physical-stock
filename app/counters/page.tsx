"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Counter, Item, CounterItem } from "@/lib/types";

const COUNTER_TYPES = ["F&B", "Retail", "Merchandise", "Mixed"] as const;

export default function CountersPage() {
  const [counters, setCounters] = useState<Counter[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [counterItems, setCounterItems] = useState<
    Record<string, CounterItem[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCounter, setEditingCounter] = useState<Counter | null>(null);
  const [formData, setFormData] = useState({
    counter_code: "",
    counter_name: "",
    counter_type: "F&B" as Counter["counter_type"],
    active: true,
  });
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const supabase = createClient();

  const fetchCounters = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("counters")
      .select("*")
      .order("counter_code");
    setCounters(data ?? []);
    setLoading(false);
  }, []);

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from("items")
      .select("*")
      .eq("active", true)
      .order("item_code");
    setItems(data ?? []);
  }, []);

  const fetchCounterItems = useCallback(async () => {
    const { data } = await supabase
      .from("counter_items")
      .select(
        `
        id,
        counter_id,
        item_id,
        active,
        item:items(*)
      `
      )
      .eq("active", true);

    const grouped: Record<string, CounterItem[]> = {};
    (data ?? []).forEach((ci: any) => {
      if (!grouped[ci.counter_id]) grouped[ci.counter_id] = [];
      grouped[ci.counter_id].push(ci);
    });
    setCounterItems(grouped);
  }, []);

  useEffect(() => {
    fetchCounters();
    fetchItems();
    fetchCounterItems();
  }, [fetchCounters, fetchItems, fetchCounterItems]);

  function openCreate() {
    setEditingCounter(null);
    setFormData({
      counter_code: "",
      counter_name: "",
      counter_type: "F&B",
      active: true,
    });
    setSelectedItems([]);
    setError(null);
    setShowForm(true);
  }

  function openEdit(counter: Counter) {
    setEditingCounter(counter);
    setFormData({
      counter_code: counter.counter_code,
      counter_name: counter.counter_name,
      counter_type: counter.counter_type,
      active: counter.active,
    });
    // Load existing mappings
    const existing = (counterItems[counter.id] ?? []).map((ci) => ci.item_id);
    setSelectedItems(existing);
    setError(null);
    setShowForm(true);
  }

  function toggleItemSelection(itemId: string) {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    let counterId: string;

    if (editingCounter) {
      const { error } = await supabase
        .from("counters")
        .update({
          counter_code: formData.counter_code,
          counter_name: formData.counter_name,
          counter_type: formData.counter_type,
          active: formData.active,
        })
        .eq("id", editingCounter.id);

      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
      counterId = editingCounter.id;

      // Remove existing mappings
      await supabase.from("counter_items").delete().eq("counter_id", counterId);
    } else {
      const { data, error } = await supabase
        .from("counters")
        .insert({
          counter_code: formData.counter_code,
          counter_name: formData.counter_name,
          counter_type: formData.counter_type,
          active: formData.active,
        })
        .select()
        .single();

      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
      counterId = data.id;
    }

    // Insert new mappings
    if (selectedItems.length > 0) {
      const mappings = selectedItems.map((itemId) => ({
        counter_id: counterId,
        item_id: itemId,
      }));
      const { error } = await supabase.from("counter_items").insert(mappings);
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setShowForm(false);
    fetchCounters();
    fetchCounterItems();
  }

  async function handleDelete(counter: Counter) {
    if (!confirm(`Delete counter "${counter.counter_name}"?`)) return;
    await supabase.from("counters").delete().eq("id", counter.id);
    fetchCounters();
    fetchCounterItems();
  }

  async function toggleActive(counter: Counter) {
    await supabase
      .from("counters")
      .update({ active: !counter.active })
      .eq("id", counter.id);
    fetchCounters();
  }

  const filteredCounters = counters.filter(
    (c) =>
      c.counter_code.toLowerCase().includes(search.toLowerCase()) ||
      c.counter_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Counters Master</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage counters and their item mappings
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          + Add Counter
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search counters..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input-field sm:max-w-xs"
      />

      {/* Counters Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : filteredCounters.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500">
            No counters found. Add your first counter to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Code</th>
                  <th className="table-header">Name</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Mapped Items</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCounters.map((counter) => {
                  const mappedItems = counterItems[counter.id] ?? [];
                  return (
                    <tr key={counter.id} className="hover:bg-gray-50">
                      <td className="table-cell font-mono text-xs font-medium">
                        {counter.counter_code}
                      </td>
                      <td className="table-cell font-medium">
                        {counter.counter_name}
                      </td>
                      <td className="table-cell">
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                          {counter.counter_type}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="text-sm text-gray-600">
                          {mappedItems.length} item
                          {mappedItems.length !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => toggleActive(counter)}
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            counter.active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {counter.active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="table-cell">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEdit(counter)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(counter)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {editingCounter ? "Edit Counter" : "Add New Counter"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Counter Code
                </label>
                <input
                  type="text"
                  required
                  value={formData.counter_code}
                  onChange={(e) =>
                    setFormData({ ...formData, counter_code: e.target.value })
                  }
                  className="input-field"
                  placeholder="e.g., CTR-001"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Counter Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.counter_name}
                  onChange={(e) =>
                    setFormData({ ...formData, counter_name: e.target.value })
                  }
                  className="input-field"
                  placeholder="e.g., Main F&B Counter"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Counter Type
                </label>
                <select
                  value={formData.counter_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      counter_type: e.target.value as Counter["counter_type"],
                    })
                  }
                  className="input-field"
                >
                  {COUNTER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) =>
                    setFormData({ ...formData, active: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="active" className="text-sm text-gray-700">
                  Active
                </label>
              </div>

              {/* Item Mapping */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Map Items to Counter
                </label>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 p-3">
                  {items.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No active items available. Create items first.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item) => (
                        <label
                          key={item.id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg p-1 hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={() => toggleItemSelection(item.id)}
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">
                            <span className="font-mono text-xs text-gray-500">
                              {item.item_code}
                            </span>{" "}
                            — {item.item_name}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {selectedItems.length} item
                  {selectedItems.length !== 1 ? "s" : ""} selected
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? "Saving..." : editingCounter ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
