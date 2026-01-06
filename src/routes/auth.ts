import { Router } from "express";
import { authorize, callback, token, refresh } from "../controllers/auth";
import multer from "multer";

const router = Router();
const upload = multer();

router.get("/authorize", authorize);
router.get("/callback", callback);
router.post("/token", upload.none(), token);
router.post("/refresh", refresh);

export default router;
