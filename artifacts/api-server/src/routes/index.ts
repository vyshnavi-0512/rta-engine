import { Router, type IRouter } from "express";
import healthRouter from "./health";
import analyticsRouter from "./analytics";
import simulatorRouter from "./simulator";

const router: IRouter = Router();

router.use(healthRouter);
router.use(analyticsRouter);
router.use(simulatorRouter);

export default router;
