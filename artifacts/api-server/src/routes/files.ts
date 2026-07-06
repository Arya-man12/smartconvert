import { Router, type IRouter } from "express";
import { DownloadFileParams } from "@workspace/api-zod";
import { getFile } from "../lib/storage";

const router: IRouter = Router();

router.get("/files/:id", async (req, res): Promise<void> => {
  const params = DownloadFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  const file = await getFile(params.data.id);
  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.fileName)}"`);
  res.send(file.buffer);
});

export default router;
