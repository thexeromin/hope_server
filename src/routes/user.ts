import { Router } from "express";
import {
  setupUser,
  searchUsers,
  getUserStats,
  logDonation
} from "../controllers/user";
import { isAuthenticated } from "../middleware/isAuthenticated";

const router = Router();

router.post("/setup", isAuthenticated, setupUser);
router.get("/search", isAuthenticated, searchUsers);
router.get("/stats", isAuthenticated, getUserStats);
router.post("/donate", isAuthenticated, logDonation);

export default router;
