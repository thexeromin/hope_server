import { Router } from "express";
import {
  createBloodRequest,
  getBloodRequests,
  getMyRequests,
  updateRequestStatus,
  deleteRequest
} from "../controllers/bloodRequest";
import { isAuthenticated } from "../middleware/isAuthenticated";

const router = Router();

router.get("/my-requests", isAuthenticated, getMyRequests);

// General Collection (Root)
// Endpoint: GET /api/blood-requests  (Feed)
// Endpoint: POST /api/blood-requests (Create)
router
  .route("/")
  .get(isAuthenticated, getBloodRequests)
  .post(isAuthenticated, createBloodRequest);

router.patch("/:id/status", isAuthenticated, updateRequestStatus);

router.delete("/:id", isAuthenticated, deleteRequest);

export default router;
