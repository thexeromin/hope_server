import { Router } from "express";
import { setupUser } from "../controllers/user";

const router = Router();

router.post("/setup", setupUser);

export default router;
