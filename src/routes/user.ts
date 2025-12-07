import { Router } from "express";
import { setupUser } from "../controllers/user";
import { isAuthenticated } from "../middleware/isAuthenticated";

const router = Router();

router.post("/setup", isAuthenticated, setupUser);

export default router;
