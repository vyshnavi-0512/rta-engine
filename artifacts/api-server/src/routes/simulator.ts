import { Router, type IRouter } from "express";
import {
  isSimulatorRunning,
  startSimulator,
  stopSimulator,
} from "../lib/simulator";

const router: IRouter = Router();

function simulatorStatus() {
  const running = isSimulatorRunning();

  return {
    running,
    mode: running ? "demo" : "privacyguard",
  };
}

router.post("/simulator/start", (_req, res) => {
  // Demo Mode uses synthetic events from the existing simulator.
  startSimulator();
  res.json(simulatorStatus());
});

router.post("/simulator/stop", (_req, res) => {
  // Privacy Guard Mode keeps ingestion open but stops synthetic events.
  stopSimulator();
  res.json(simulatorStatus());
});

router.get("/simulator/status", (_req, res) => {
  res.json(simulatorStatus());
});
export default router;