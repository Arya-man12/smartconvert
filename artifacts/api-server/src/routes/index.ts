import { Router, type IRouter } from "express";
import healthRouter from "./health";
import convertRouter from "./convert";
import compressRouter from "./compress";
import filesRouter from "./files";
import historyRouter from "./history";

const router: IRouter = Router();

router.use(healthRouter);
router.use(convertRouter);
router.use(compressRouter);
router.use(filesRouter);
router.use(historyRouter);

export default router;
