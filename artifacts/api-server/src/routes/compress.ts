import { Router, type IRouter } from "express";
import multer from "multer";
import { nanoid } from "nanoid";
import {
  CompressFilesBody,
  CompressFilesResponse,
  AdaptiveCompressResponse,
  BenchmarkCompressBody,
  BenchmarkCompressResponse,
} from "@workspace/api-zod";
import { runCompression, ALL_ALGORITHMS } from "../lib/compression";
import { analyzeFile, chooseAlgorithm } from "../lib/analysis";
import { saveFile } from "../lib/storage";
import { recordHistory } from "../lib/history";
import type { CompressionAlgorithm } from "@workspace/api-zod";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const router: IRouter = Router();

router.post("/compress", upload.array("files"), async (req, res): Promise<void> => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    res.status(400).json({ error: "At least one file is required" });
    return;
  }

  const parsed = CompressFilesBody.omit({ files: true }).safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid compression request");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const file = files[0]!;

  try {
    const stats = await runCompression(parsed.data.algorithm, file.buffer, file.originalname);
    const stored = await saveFile(`${file.originalname}.${parsed.data.algorithm}`, "application/octet-stream", stats.compressed);

    const result = {
      id: nanoid(),
      fileName: file.originalname,
      algorithm: parsed.data.algorithm,
      originalSize: stats.originalSize,
      compressedSize: stats.compressedSize,
      compressionRatio: stats.compressionRatio,
      compressionTimeMs: stats.compressionTimeMs,
      decompressionTimeMs: stats.decompressionTimeMs,
      compressionSpeedMBps: stats.compressionSpeedMBps,
      downloadUrl: stored.downloadUrl,
      createdAt: new Date(),
    };

    await recordHistory(
      "compress",
      `Compressed ${file.originalname} with ${parsed.data.algorithm}`,
      `Ratio ${stats.compressionRatio.toFixed(2)}x`,
    );

    res.status(201).json(CompressFilesResponse.parse(result));
  } catch (error) {
    req.log.error({ err: error }, "Compression failed");
    res.status(400).json({ error: error instanceof Error ? error.message : "Compression failed" });
  }
});

router.post("/compress/adaptive", upload.array("files"), async (req, res): Promise<void> => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    res.status(400).json({ error: "At least one file is required" });
    return;
  }

  const file = files[0]!;

  try {
    const analysis = analyzeFile(file.buffer, file.originalname, file.mimetype);
    const choice = chooseAlgorithm(analysis, file.buffer.length);
    const stats = await runCompression(choice.algorithm, file.buffer, file.originalname);
    const stored = await saveFile(`${file.originalname}.${choice.algorithm}`, "application/octet-stream", stats.compressed);

    const result = {
      id: nanoid(),
      fileName: file.originalname,
      algorithm: choice.algorithm,
      originalSize: stats.originalSize,
      compressedSize: stats.compressedSize,
      compressionRatio: stats.compressionRatio,
      compressionTimeMs: stats.compressionTimeMs,
      decompressionTimeMs: stats.decompressionTimeMs,
      compressionSpeedMBps: stats.compressionSpeedMBps,
      downloadUrl: stored.downloadUrl,
      analysis,
      reasons: choice.reasons,
      createdAt: new Date(),
    };

    await recordHistory(
      "adaptive",
      `Adaptively compressed ${file.originalname} using ${choice.algorithm}`,
      choice.reasons.join(" "),
    );

    res.status(201).json(AdaptiveCompressResponse.parse(result));
  } catch (error) {
    req.log.error({ err: error }, "Adaptive compression failed");
    res.status(400).json({ error: error instanceof Error ? error.message : "Adaptive compression failed" });
  }
});

router.post("/compress/benchmark", upload.array("files"), async (req, res): Promise<void> => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    res.status(400).json({ error: "At least one file is required" });
    return;
  }

  const parsed = BenchmarkCompressBody.omit({ files: true }).safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid benchmark request");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const file = files[0]!;
  const requested = parsed.data.algorithms
    .split(",")
    .map((a) => a.trim())
    .filter((a) => a.length > 0) as CompressionAlgorithm[];
  const algorithms = requested.length > 0 ? requested : ALL_ALGORITHMS;

  const invalid = algorithms.filter((a) => !ALL_ALGORITHMS.includes(a));
  if (invalid.length > 0) {
    res.status(400).json({ error: `Unknown algorithm(s): ${invalid.join(", ")}` });
    return;
  }

  try {
    const entries = await Promise.all(
      algorithms.map(async (algorithm) => {
        const startMem = process.memoryUsage().heapUsed;
        const stats = await runCompression(algorithm, file.buffer, file.originalname);
        const endMem = process.memoryUsage().heapUsed;
        return {
          algorithm,
          compressedSize: stats.compressedSize,
          compressionRatio: stats.compressionRatio,
          compressionTimeMs: stats.compressionTimeMs,
          decompressionTimeMs: stats.decompressionTimeMs,
          memoryUsageKb: Math.max(0, Math.round((endMem - startMem) / 1024)),
        };
      }),
    );

    const best = entries.reduce((a, b) => (b.compressionRatio > a.compressionRatio ? b : a));

    const result = {
      id: nanoid(),
      fileName: file.originalname,
      originalSize: file.buffer.length,
      entries,
      bestAlgorithm: best.algorithm,
      createdAt: new Date(),
    };

    await recordHistory(
      "benchmark",
      `Benchmarked ${algorithms.length} algorithm(s) on ${file.originalname}`,
      `Best: ${best.algorithm}`,
    );

    res.status(201).json(BenchmarkCompressResponse.parse(result));
  } catch (error) {
    req.log.error({ err: error }, "Benchmark failed");
    res.status(400).json({ error: error instanceof Error ? error.message : "Benchmark failed" });
  }
});

export default router;
