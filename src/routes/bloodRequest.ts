import { Router } from "express";
import {
  createBloodRequest,
  getBloodRequests
} from "../controllers/bloodRequest";
import { isAuthenticated } from "../middleware/isAuthenticated";

const router = Router();

router.post("/blood-request", isAuthenticated, createBloodRequest);
router.get("/blood-requests", isAuthenticated, getBloodRequests);

export default router;
