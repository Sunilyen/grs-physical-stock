/**
 * CSV Export Utility for Manager Consolidated Stock Reports
 *
 * Generates a downloadable CSV file from consolidated physical stock count data.
 * Handles special characters, quotes, and commas gracefully.
 */

export interface ConsolidatedStockRow {
  item_code: string;
  item_name: string;
  mou: string;
  category: string;
  counter_quantities: Record<string, number>; // counter_name -> qty
  total_physical_stock: number;
}

/**
 * Escapes a single CSV field value.
 * - Wraps in double quotes if the value contains commas, quotes, or newlines
 * - Escapes internal double quotes by doubling them
 */
function escapeCSVField(value: string | number): string {
  const str = String(value);
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts consolidated stock data into a CSV string.
 *
 * @param data - Array of consolidated stock rows
 * @param counterNames - Ordered list of counter names for column headers
 * @returns CSV string with header row and data rows
 */
export function buildConsolidatedCSV(
  data: ConsolidatedStockRow[],
  counterNames: string[]
): string {
  // Build header row
  const headers = [
    "Item Code",
    "Item Name",
    "MOU",
    "Category",
    ...counterNames.map((name) => `${name} Qty`),
    "Total Physical Stock",
  ];

  const headerRow = headers.map(escapeCSVField).join(",");

  // Build data rows
  const dataRows = data.map((row) => {
    const fields = [
      row.item_code,
      row.item_name,
      row.mou,
      row.category,
      ...counterNames.map((name) => row.counter_quantities[name] ?? 0),
      row.total_physical_stock,
    ];
    return fields.map(escapeCSVField).join(",");
  });

  return [headerRow, ...dataRows].join("\n");
}

/**
 * Triggers a browser download of the given CSV content.
 *
 * @param csvContent - The CSV string to download
 * @param filename - The filename for the downloaded file (without extension)
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Add BOM for Excel compatibility with special characters
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Main export function: builds CSV from data and triggers download.
 *
 * @param data - Array of consolidated stock rows
 * @param dateString - Business date string used in the filename
 * @param counterNames - Ordered list of counter names for column headers
 */
export function exportConsolidatedStockToCSV(
  data: ConsolidatedStockRow[],
  dateString: string,
  counterNames: string[]
): void {
  const csv = buildConsolidatedCSV(data, counterNames);
  const sanitizedDate = dateString.replace(/[^a-zA-Z0-9_-]/g, "_");
  downloadCSV(csv, `${sanitizedDate}_Consolidated_Physical_Stock`);
}
