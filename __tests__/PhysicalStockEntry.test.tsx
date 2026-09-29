import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import PhysicalStockEntry, { SKUItem } from "@/components/PhysicalStockEntry";

const mockItems: SKUItem[] = [
  {
    id: "item-1",
    item_code: "R001",
    item_name: "T-Shirt",
    mou: "No",
    category: "Retail",
  },
  {
    id: "item-2",
    item_code: "R002",
    item_name: "Cap",
    mou: "No",
    category: "Retail",
  },
  {
    id: "item-3",
    item_code: "F001",
    item_name: "Espresso Beans",
    mou: "Pack",
    category: "F&B",
  },
];

describe("PhysicalStockEntry Component", () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("Validation Test: Submit button is disabled when items remain uncounted", () => {
    render(
      <PhysicalStockEntry
        counterId="c-1"
        counterName="Retail Counter"
        initialItems={mockItems}
        onSubmit={mockOnSubmit}
      />
    );

    const submitButton = screen.getByRole("button", {
      name: /Complete All Items/i,
    });

    expect(submitButton).toBeDisabled();
    expect(screen.getByText("0 / 3 Items Counted")).toBeInTheDocument();
  });

  test("Zero Entry Test: Typing 0 counts as a valid physical entry and updates progress", () => {
    render(
      <PhysicalStockEntry
        counterId="c-1"
        counterName="Retail Counter"
        initialItems={mockItems}
        onSubmit={mockOnSubmit}
      />
    );

    const firstInput = document.getElementById("stock-input-0") as HTMLInputElement;

    fireEvent.change(firstInput, { target: { value: "0" } });

    expect(firstInput.value).toBe("0");
    expect(screen.getByText("1 / 3 Items Counted")).toBeInTheDocument();
  });

  test("Keyboard Navigation Test: Pressing Enter or Tab moves focus to the next item", () => {
    render(
      <PhysicalStockEntry
        counterId="c-1"
        counterName="Retail Counter"
        initialItems={mockItems}
        onSubmit={mockOnSubmit}
      />
    );

    const input0 = document.getElementById("stock-input-0") as HTMLInputElement;
    const input1 = document.getElementById("stock-input-1") as HTMLInputElement;

    input0.focus();
    expect(document.activeElement).toBe(input0);

    fireEvent.keyDown(input0, { key: "Enter", code: "Enter" });

    expect(document.activeElement).toBe(input1);
  });

  test("Search Filter Test: Filtering items preserves quantities typed in hidden rows", () => {
    render(
      <PhysicalStockEntry
        counterId="c-1"
        counterName="Retail Counter"
        initialItems={mockItems}
        onSubmit={mockOnSubmit}
      />
    );

    const capInput = document.getElementById("stock-input-1") as HTMLInputElement;
    fireEvent.change(capInput, { target: { value: "15" } });

    const searchBar = screen.getByPlaceholderText(
      "Search by Item Code or Name..."
    );
    fireEvent.change(searchBar, { target: { value: "T-Shirt" } });

    expect(screen.getByText("T-Shirt")).toBeInTheDocument();
    expect(screen.queryByText("Cap")).not.toBeInTheDocument();

    fireEvent.change(searchBar, { target: { value: "" } });

    const capInputRestored = document.getElementById(
      "stock-input-1"
    ) as HTMLInputElement;
    expect(capInputRestored.value).toBe("15");
  });
});
