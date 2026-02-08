import { Router } from "express";
import {
  setupUser,
  findDonors,
  getUserStats,
  logDonation,
  updatePushToken
} from "../controllers/user";
import { isAuthenticated } from "../middleware/isAuthenticated";

const router = Router();

router.post("/setup", isAuthenticated, setupUser);
router.get("/find-donors", isAuthenticated, findDonors);
router.get("/stats", isAuthenticated, getUserStats);
router.post("/donate", isAuthenticated, logDonation);
router.put("/push-token", isAuthenticated, updatePushToken);

export default router;
