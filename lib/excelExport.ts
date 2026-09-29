import * as XLSX from "xlsx";

export interface StockExportItem {
  item_code: string;
  item_name: string;
  category: string;
  mou: string;
  unit_price: number;
  counted_qty: number;
}

export interface StockExportData {
  counterId: string;
  counterName: string;
  businessDate: string;
  sessionId: string;
  submittedAt: string;
  items: StockExportItem[];
}

export function exportStockCountToExcel(data: StockExportData): void {
  const wb = XLSX.utils.book_new();

  // Build worksheet data
  const wsData: (string | number)[][] = [];

  // Header block
  wsData.push(["GRS RETAIL & CONCESSIONS"]);
  wsData.push(["Daily Physical Stock Take Audit Receipt"]);
  wsData.push([]);
  wsData.push(["Counter ID:", data.counterId]);
  wsData.push(["Counter Name:", data.counterName]);
  wsData.push(["Business Date:", data.businessDate]);
  wsData.push(["Session ID:", data.sessionId]);
  wsData.push(["Submission Timestamp:", data.submittedAt]);
  wsData.push([]);

  // Table headers
  const headers = [
    "SKU Code",
    "Item Description",
    "Category",
    "Unit (MOU)",
    "Unit Price ($)",
    "Physical Counted Qty",
    "Total Valuation ($)",
  ];
  wsData.push(headers);

  // Data rows
  data.items.forEach((item) => {
    const valuation = item.counted_qty * item.unit_price;
    wsData.push([
      item.item_code,
      item.item_name,
      item.category,
      item.mou,
      item.unit_price,
      item.counted_qty,
      valuation,
    ]);
  });

  // Summary block with SUM formulas
  const lastRow = wsData.length;
  const firstDataRow = 9; // Row index where data starts (1-based in Excel)
  const lastDataRow = lastRow; // Last data row (1-based in Excel)

  wsData.push([]);
  wsData.push(["", "", "", "", "", "Total Units Counted:", `=SUM(F${firstDataRow}:F${lastDataRow})`]);
  wsData.push(["", "", "", "", "", "Total Inventory Valuation ($):", `=SUM(G${firstDataRow}:G${lastDataRow})`]);

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Configure column widths
  ws["!cols"] = [
    { wch: 14 }, // SKU Code
    { wch: 30 }, // Item Description
    { wch: 14 }, // Category
    { wch: 12 }, // Unit (MOU)
    { wch: 14 }, // Unit Price
    { wch: 20 }, // Physical Counted Qty
    { wch: 18 }, // Total Valuation
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "Stock Take");

  // Generate filename
  const filename = `Stock_Take_${data.counterId}_${data.businessDate}.xlsx`;

  // Trigger download
  XLSX.writeFile(wb, filename);
}
