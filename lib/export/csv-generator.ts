import type { CsvRow, MarketplaceType } from "./types";

const MARKETPLACE_TITLE_LIMITS: Record<MarketplaceType, number> = {
  ETSY: 140,
  ADOBE_STOCK: 200,
};

/**
 * Escape a value for CSV format
 */
function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Truncate title to marketplace-specific limit
 */
function truncateTitle(title: string, marketplace: MarketplaceType): string {
  const maxLength = MARKETPLACE_TITLE_LIMITS[marketplace];
  if (title.length <= maxLength) return title;
  return title.slice(0, maxLength - 3) + "...";
}

/**
 * Generate CSV content with proper escaping and BOM for Excel compatibility
 */
export function generateCsv(rows: CsvRow[], marketplace: MarketplaceType): string {
  const headers = ["Filename", "Title", "Description", "Tags"];
  const lines: string[] = [headers.join(",")];

  for (const row of rows) {
    const values = [
      escapeCsv(row.filename),
      escapeCsv(truncateTitle(row.title, marketplace)),
      escapeCsv(row.description),
      escapeCsv(row.tags),
    ];
    lines.push(values.join(","));
  }

  // Add BOM for Excel compatibility
  const bom = "\uFEFF";
  return bom + lines.join("\n");
}
