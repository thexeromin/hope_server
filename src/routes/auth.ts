import { Router } from "express";
import { authorize, callback, token, refresh } from "../controllers/auth";

const router = Router();

router.get("authorize", authorize);
router.get("callback", callback);
router.post("token", token);
router.post("refresh", refresh);

export default router;
