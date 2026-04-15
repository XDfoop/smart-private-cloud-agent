import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storageRouter from "./storage";
import filesRouter from "./files";
import aiRouter from "./ai";
import authRouter from "./auth";
import userSettingsRouter from "./user-settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(filesRouter);
router.use(aiRouter);
router.use(authRouter);
router.use(userSettingsRouter);

export default router;
