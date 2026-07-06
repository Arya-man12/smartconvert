export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, exponent);
  return `${exponent === 0 ? value : value.toFixed(2)} ${units[exponent]}`;
}

export function formatMs(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}x`;
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export function algorithmLabel(algorithm: string): string {
  const labels: Record<string, string> = {
    zip: "ZIP",
    gzip: "Gzip",
    bzip2: "Bzip2",
    lzma: "LZMA",
    brotli: "Brotli",
    zstd: "Zstandard",
    lz4: "LZ4",
    snappy: "Snappy",
  };
  return labels[algorithm] ?? algorithm;
}

export function conversionLabel(type: string): string {
  const labels: Record<string, string> = {
    "docx-to-pdf": "DOCX → PDF",
    "pdf-to-docx": "PDF → DOCX",
    "pdf-to-txt": "PDF → TXT",
    "pdf-to-markdown": "PDF → Markdown",
    "images-to-pdf": "Images → PDF",
    "pdf-to-images": "PDF → Images",
  };
  return labels[type] ?? type;
}
