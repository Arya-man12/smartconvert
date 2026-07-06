import zlib from "node:zlib";
import JSZip from "jszip";
import compressjs from "compressjs";
import LZMAConstructor from "lzma";
import { ZstdCodec } from "zstd-codec";
import lz4 from "lz4js";
import snappyjs from "snappyjs";
import type { CompressionAlgorithm } from "@workspace/api-zod";

const lzma = new LZMAConstructor.LZMA();

let zstdSimplePromise: Promise<{
  compress: (data: Uint8Array) => Uint8Array;
  decompress: (data: Uint8Array) => Uint8Array;
}> | null = null;

function getZstdSimple() {
  if (!zstdSimplePromise) {
    zstdSimplePromise = new Promise((resolve) => {
      ZstdCodec.run((zstd) => {
        const simple = new zstd.Simple();
        resolve({
          compress: (data: Uint8Array) => simple.compress(data),
          decompress: (data: Uint8Array) => simple.decompress(data),
        });
      });
    });
  }
  return zstdSimplePromise;
}

function lzmaCompress(buffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    lzma.compress(buffer, 1, (result: number[] | undefined, error?: Error) => {
      if (error || !result) {
        reject(error ?? new Error("LZMA compression failed"));
        return;
      }
      resolve(Buffer.from(new Int8Array(result)));
    });
  });
}

function lzmaDecompress(buffer: Buffer): Promise<Buffer> {
  const byteArray = Array.from(new Int8Array(buffer.buffer, buffer.byteOffset, buffer.length));
  return new Promise((resolve, reject) => {
    lzma.decompress(byteArray, (result: string | number[] | undefined, error?: Error) => {
      if (error || result === undefined) {
        reject(error ?? new Error("LZMA decompression failed"));
        return;
      }
      if (typeof result === "string") {
        resolve(Buffer.from(result, "binary"));
      } else {
        resolve(Buffer.from(new Uint8Array(result)));
      }
    });
  });
}

async function zipCompress(buffer: Buffer, fileName: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(fileName, buffer);
  const out = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return out;
}

async function zipDecompress(buffer: Buffer, fileName: string): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);
  const entry = zip.file(fileName) ?? Object.values(zip.files)[0];
  if (!entry) {
    throw new Error("No entry found in zip archive");
  }
  const out = await entry.async("nodebuffer");
  return out;
}

export async function compressBuffer(
  algorithm: CompressionAlgorithm,
  buffer: Buffer,
  fileName: string,
): Promise<Buffer> {
  switch (algorithm) {
    case "zip":
      return zipCompress(buffer, fileName);
    case "gzip":
      return zlib.gzipSync(buffer);
    case "bzip2":
      return Buffer.from(compressjs.Bzip2.compressFile(buffer));
    case "lzma":
      return lzmaCompress(buffer);
    case "brotli":
      return zlib.brotliCompressSync(buffer);
    case "zstd": {
      const zstd = await getZstdSimple();
      return Buffer.from(zstd.compress(new Uint8Array(buffer)));
    }
    case "lz4":
      return Buffer.from(lz4.compress(new Uint8Array(buffer)));
    case "snappy":
      return Buffer.from(snappyjs.compress(Buffer.from(buffer)));
    default:
      throw new Error(`Unsupported compression algorithm: ${String(algorithm)}`);
  }
}

export async function decompressBuffer(
  algorithm: CompressionAlgorithm,
  buffer: Buffer,
  fileName: string,
): Promise<Buffer> {
  switch (algorithm) {
    case "zip":
      return zipDecompress(buffer, fileName);
    case "gzip":
      return zlib.gunzipSync(buffer);
    case "bzip2":
      return Buffer.from(compressjs.Bzip2.decompressFile(buffer));
    case "lzma":
      return lzmaDecompress(buffer);
    case "brotli":
      return zlib.brotliDecompressSync(buffer);
    case "zstd": {
      const zstd = await getZstdSimple();
      return Buffer.from(zstd.decompress(new Uint8Array(buffer)));
    }
    case "lz4":
      return Buffer.from(lz4.decompress(new Uint8Array(buffer)));
    case "snappy":
      return Buffer.from(snappyjs.uncompress(Buffer.from(buffer)));
    default:
      throw new Error(`Unsupported compression algorithm: ${String(algorithm)}`);
  }
}

export interface CompressionStats {
  compressed: Buffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  compressionTimeMs: number;
  decompressionTimeMs: number;
  compressionSpeedMBps: number;
}

export async function runCompression(
  algorithm: CompressionAlgorithm,
  buffer: Buffer,
  fileName: string,
): Promise<CompressionStats> {
  const originalSize = buffer.length;

  const compressStart = performance.now();
  const compressed = await compressBuffer(algorithm, buffer, fileName);
  const compressionTimeMs = performance.now() - compressStart;

  const decompressStart = performance.now();
  await decompressBuffer(algorithm, compressed, fileName);
  const decompressionTimeMs = performance.now() - decompressStart;

  const compressedSize = compressed.length;
  const compressionRatio = originalSize === 0 ? 0 : originalSize / compressedSize;
  const compressionSpeedMBps =
    compressionTimeMs === 0 ? 0 : originalSize / 1024 / 1024 / (compressionTimeMs / 1000);

  return {
    compressed,
    originalSize,
    compressedSize,
    compressionRatio,
    compressionTimeMs,
    decompressionTimeMs,
    compressionSpeedMBps,
  };
}

export const ALL_ALGORITHMS: CompressionAlgorithm[] = [
  "zip",
  "gzip",
  "bzip2",
  "lzma",
  "brotli",
  "zstd",
  "lz4",
  "snappy",
];
