import { Router, type IRouter } from "express";
import multer from "multer";
import {
  ConvertFilesBody,
  ConvertFilesResponse,
} from "@workspace/api-zod";
import { convertFiles } from "../lib/conversion";
import { saveFile } from "../lib/storage";
import { recordHistory } from "../lib/history";
import { nanoid } from "nanoid";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const router: IRouter = Router();

router.post("/convert", upload.array("files"), async (req, res): Promise<void> => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    res.status(400).json({ error: "At least one file is required" });
    return;
  }

  const parsed = ConvertFilesBody.omit({ files: true }).safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid conversion request");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const outcome = await convertFiles(
      parsed.data.conversionType,
      files.map((f) => ({ fileName: f.originalname, mimeType: f.mimetype, buffer: f.buffer })),
    );

    const outputs = await Promise.all(
      outcome.files.map((f) => saveFile(f.fileName, f.mimeType, f.buffer)),
    );

    const result = {
      id: nanoid(),
      conversionType: parsed.data.conversionType,
      sourceFileNames: files.map((f) => f.originalname),
      outputs,
      warning: outcome.warning,
      createdAt: new Date(),
    };

    await recordHistory(
      "convert",
      `Converted ${files.length} file(s) using ${parsed.data.conversionType}`,
      outputs.map((o) => o.fileName).join(", "),
    );

    res.status(201).json(ConvertFilesResponse.parse(result));
  } catch (error) {
    req.log.error({ err: error }, "Conversion failed");
    res.status(400).json({ error: error instanceof Error ? error.message : "Conversion failed" });
  }
});

export default router;
