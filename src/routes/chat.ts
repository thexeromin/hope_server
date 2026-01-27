import { Router } from "express";
import { initiateChat, getMessages, getMyChats } from "../controllers/chat";
import { isAuthenticated } from "../middleware/isAuthenticated";

const router = Router();

router.post("/initiate", isAuthenticated, initiateChat);
router.get("/", isAuthenticated, getMyChats);
router.get("/:roomId/messages", isAuthenticated, getMessages);

export default router;
