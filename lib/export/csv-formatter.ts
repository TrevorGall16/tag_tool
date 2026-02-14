import type { LocalGroup } from "@/store/useBatchStore";

// ─── Preset Types ────────────────────────────────────────────

export interface CsvFormatPreset {
  id: string;
  label: string;
  description: string;
  separator: "," | ";";
  headers: {
    filename: string;
    title: string;
    description: string;
    tags: string;
  };
}

// ─── Built-in Presets ────────────────────────────────────────

export const CSV_PRESETS: CsvFormatPreset[] = [
  {
    id: "standard",
    label: "Standard / Shutterstock",
    description: "Comma-separated, standard headers",
    separator: ",",
    headers: { filename: "Filename", title: "Title", description: "Description", tags: "Keywords" },
  },
  {
    id: "adobe",
    label: "Adobe Stock",
    description: "Semicolon-separated, prevents splitting titles with commas",
    separator: ";",
    headers: { filename: "Filename", title: "Title", description: "Description", tags: "Keywords" },
  },
  {
    id: "getty",
    label: "Getty / ESP",
    description: "Comma-separated, strict Getty field names",
    separator: ",",
    headers: {
      filename: "Filename",
      title: "ObjectName",
      description: "Caption",
      tags: "Keywords",
    },
  },
];

// ─── Format Options ──────────────────────────────────────────

export interface CsvFormatOptions {
  preset: CsvFormatPreset;
  includeExtraTags: boolean;
  tagsMax: number;
}

// ─── Helpers ─────────────────────────────────────────────────

function getGroupMetadata(group: LocalGroup) {
  const firstImage = group.images[0];
  const title = firstImage?.userTitle || group.sharedTitle || firstImage?.aiTitle || "";
  const description = group.sharedDescription || "";
  const tags = firstImage?.userTags || group.sharedTags || firstImage?.aiTags || [];
  return { title, description, tags };
}

function escapeCsvField(value: string, separator: string): string {
  if (value.includes(separator) || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Generate a formatted CSV preview string from groups using the given preset & options.
 * Returns { header, rows, full } for flexible rendering.
 */
export function formatPreviewCsv(
  groups: LocalGroup[],
  options: CsvFormatOptions
): { header: string; rows: string; full: string } {
  const { preset, includeExtraTags, tagsMax } = options;
  const sep = preset.separator;
  const h = preset.headers;

  const header = [h.filename, h.title, h.description, h.tags]
    .map((v) => escapeCsvField(v, sep))
    .join(sep);

  const rowLines: string[] = [];

  for (const group of groups) {
    if (group.id === "unclustered" || group.images.length === 0) continue;

    const { title, description, tags } = getGroupMetadata(group);
    const finalTags = includeExtraTags ? tags : tags.slice(0, tagsMax);
    const filename = group.images[0]?.originalFilename || "image.jpg";

    const row = [
      escapeCsvField(filename, sep),
      escapeCsvField(title, sep),
      escapeCsvField(description, sep),
      escapeCsvField(finalTags.join(", "), sep),
    ].join(sep);

    rowLines.push(row);
  }

  const rows = rowLines.join("\n");
  return { header, rows, full: `${header}\n${rows}` };
}
