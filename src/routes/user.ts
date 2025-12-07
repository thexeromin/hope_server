import { Router } from "express";
import { setupUser, searchUsers } from "../controllers/user";
import { isAuthenticated } from "../middleware/isAuthenticated";

const router = Router();

router.post("/setup", isAuthenticated, setupUser);
router.get("/search", isAuthenticated, searchUsers);

export default router;
