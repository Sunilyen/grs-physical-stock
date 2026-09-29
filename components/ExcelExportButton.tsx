"use client";

import React, { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import {
  exportStockCountToExcel,
  type StockExportData,
} from "@/lib/excelExport";

interface ExcelExportButtonProps {
  data: StockExportData;
}

export default function ExcelExportButton({ data }: ExcelExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    setLoading(true);
    setError(null);

    try {
      exportStockCountToExcel(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to export Excel file"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleExport}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FileSpreadsheet className="w-4 h-4" />
        {loading ? "Generating..." : "Export to Excel"}
      </button>

      {error && (
        <p className="text-sm text-red-600">Export failed: {error}</p>
      )}
    </div>
  );
}
