import type { FileAnalysis, CompressionAlgorithm } from "@workspace/api-zod";

const ALREADY_COMPRESSED_EXTENSIONS = [
  ".zip",
  ".gz",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".mp3",
  ".mp4",
  ".mov",
  ".7z",
  ".rar",
  ".pdf",
];

function computeEntropy(buffer: Buffer): number {
  if (buffer.length === 0) {
    return 0;
  }
  const freq = new Array<number>(256).fill(0);
  for (const byte of buffer) {
    freq[byte]++;
  }
  let entropy = 0;
  for (const count of freq) {
    if (count === 0) continue;
    const p = count / buffer.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function computeRepetitionScore(buffer: Buffer): number {
  if (buffer.length < 8) {
    return 0;
  }
  const sampleSize = Math.min(buffer.length, 65536);
  const sample = buffer.subarray(0, sampleSize);
  const seen = new Map<string, number>();
  const chunkSize = 4;
  let chunks = 0;
  for (let i = 0; i + chunkSize <= sample.length; i += chunkSize) {
    const key = sample.subarray(i, i + chunkSize).toString("hex");
    seen.set(key, (seen.get(key) ?? 0) + 1);
    chunks++;
  }
  if (chunks === 0) {
    return 0;
  }
  let repeated = 0;
  for (const count of seen.values()) {
    if (count > 1) {
      repeated += count - 1;
    }
  }
  return repeated / chunks;
}

function looksLikeText(buffer: Buffer): boolean {
  const sampleSize = Math.min(buffer.length, 8192);
  let printable = 0;
  for (let i = 0; i < sampleSize; i++) {
    const byte = buffer[i];
    if (byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte < 127)) {
      printable++;
    }
  }
  return sampleSize === 0 ? true : printable / sampleSize > 0.9;
}

function computeAvgLineLength(buffer: Buffer): number | null {
  const text = buffer.toString("utf-8", 0, Math.min(buffer.length, 65536));
  const lines = text.split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) {
    return null;
  }
  const total = lines.reduce((sum, l) => sum + l.length, 0);
  return total / lines.length;
}

export function analyzeFile(buffer: Buffer, fileName: string, mimeType: string): FileAnalysis {
  const entropy = computeEntropy(buffer);
  const isText = looksLikeText(buffer);
  const repetitionScore = computeRepetitionScore(buffer);
  const extension = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  const alreadyCompressed =
    entropy > 7.5 || ALREADY_COMPRESSED_EXTENSIONS.includes(extension) || mimeType.startsWith("image/");
  const avgLineLength = isText ? computeAvgLineLength(buffer) : null;

  return {
    mimeType,
    isText,
    entropy,
    alreadyCompressed,
    repetitionScore,
    avgLineLength,
  };
}

export interface AdaptiveChoice {
  algorithm: CompressionAlgorithm;
  reasons: string[];
}

export function chooseAlgorithm(analysis: FileAnalysis, fileSize: number): AdaptiveChoice {
  const reasons: string[] = [];

  if (analysis.alreadyCompressed) {
    reasons.push(
      `High byte entropy (${analysis.entropy.toFixed(2)} bits/byte) or a known pre-compressed format suggests this data is already dense — heavier algorithms would spend time for little extra gain.`,
    );
    reasons.push("Snappy was chosen to package the file quickly with minimal CPU overhead.");
    return { algorithm: "snappy", reasons };
  }

  if (analysis.isText && analysis.repetitionScore > 0.35) {
    reasons.push(
      `The content is text with a high repetition score (${(analysis.repetitionScore * 100).toFixed(0)}%), which dictionary-based algorithms like Brotli exploit very effectively.`,
    );
    reasons.push("Brotli was chosen for its strong text-oriented static dictionary and high compression ratio.");
    return { algorithm: "brotli", reasons };
  }

  if (analysis.isText && fileSize > 5 * 1024 * 1024) {
    reasons.push("Large text payload detected — LZMA gives the best ratio for big, compressible text at the cost of extra compression time.");
    reasons.push(`File size (${(fileSize / 1024 / 1024).toFixed(1)} MB) is large enough that the ratio gain outweighs the slower compression speed.`);
    return { algorithm: "lzma", reasons };
  }

  if (analysis.isText) {
    reasons.push("Text content with moderate repetition benefits from Zstandard's balance of speed and ratio.");
    reasons.push(`Entropy of ${analysis.entropy.toFixed(2)} bits/byte indicates meaningful redundancy Zstd can exploit.`);
    return { algorithm: "zstd", reasons };
  }

  if (fileSize < 256 * 1024) {
    reasons.push("Small binary file — LZ4's near-instant compression speed matters more than a marginally better ratio here.");
    return { algorithm: "lz4", reasons };
  }

  reasons.push(
    `Binary data with moderate entropy (${analysis.entropy.toFixed(2)} bits/byte) — Zstandard offers the best balance of speed and compression ratio for general-purpose binary payloads.`,
  );
  return { algorithm: "zstd", reasons };
}
