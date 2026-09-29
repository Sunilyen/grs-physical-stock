"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Item } from "@/lib/types";

const CATEGORIES = ["F&B", "Retail", "Merchandise"] as const;

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState({
    item_code: "",
    item_name: "",
    mou: "",
    category: "F&B" as Item["category"],
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const supabase = createClient();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("items")
      .select("*")
      .order("item_code");
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function openCreate() {
    setEditingItem(null);
    setFormData({
      item_code: "",
      item_name: "",
      mou: "",
      category: "F&B",
      active: true,
    });
    setError(null);
    setShowForm(true);
  }

  function openEdit(item: Item) {
    setEditingItem(item);
    setFormData({
      item_code: item.item_code,
      item_name: item.item_name,
      mou: item.mou,
      category: item.category,
      active: item.active,
    });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (editingItem) {
      const { error } = await supabase
        .from("items")
        .update({
          item_code: formData.item_code,
          item_name: formData.item_name,
          mou: formData.mou,
          category: formData.category,
          active: formData.active,
        })
        .eq("id", editingItem.id);

      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("items").insert({
        item_code: formData.item_code,
        item_name: formData.item_name,
        mou: formData.mou,
        category: formData.category,
        active: formData.active,
      });

      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setShowForm(false);
    fetchItems();
  }

  async function handleDelete(item: Item) {
    if (!confirm(`Delete item "${item.item_name}"?`)) return;
    await supabase.from("items").delete().eq("id", item.id);
    fetchItems();
  }

  async function toggleActive(item: Item) {
    await supabase
      .from("items")
      .update({ active: !item.active })
      .eq("id", item.id);
    fetchItems();
  }

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.item_code.toLowerCase().includes(search.toLowerCase()) ||
      item.item_name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      filterCategory === "all" || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Items Master</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your inventory items
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          + Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Search by code or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field sm:max-w-xs"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="input-field sm:max-w-[180px]"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Items Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : filteredItems.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500">
            No items found. Add your first item to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Code</th>
                  <th className="table-header">Name</th>
                  <th className="table-header">MOU</th>
                  <th className="table-header">Category</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="table-cell font-mono text-xs font-medium">
                      {item.item_code}
                    </td>
                    <td className="table-cell font-medium">
                      {item.item_name}
                    </td>
                    <td className="table-cell">{item.mou}</td>
                    <td className="table-cell">
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => toggleActive(item)}
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="table-cell">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {editingItem ? "Edit Item" : "Add New Item"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Item Code
                </label>
                <input
                  type="text"
                  required
                  value={formData.item_code}
                  onChange={(e) =>
                    setFormData({ ...formData, item_code: e.target.value })
                  }
                  className="input-field"
                  placeholder="e.g., FNB-001"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Item Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.item_name}
                  onChange={(e) =>
                    setFormData({ ...formData, item_name: e.target.value })
                  }
                  className="input-field"
                  placeholder="e.g., Chicken Biryani"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    MOU
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.mou}
                    onChange={(e) =>
                      setFormData({ ...formData, mou: e.target.value })
                    }
                    className="input-field"
                    placeholder="e.g., pcs, kg"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as Item["category"],
                      })
                    }
                    className="input-field"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
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
                  {saving ? "Saving..." : editingItem ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
