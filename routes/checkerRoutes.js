import express from "express";
import {
  getCheckerActiveDCLs,
  getCheckerMyQueue,
  getCompletedDCLsForChecker, // updated API
  getCheckerDclById,
  updateCheckerDclStatus,
  getAutoMovedCheckerMyQueue,
  getCheckerReports,
  approveCheckerDclWithNotification,
  rejectCheckerDclWithNotification,
  updateCheckerStatus
  // getCompletedDclsForChecker
} from "../controllers/checkerController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// 1. Active DCLs (CoCreator stage)
router.get("/active-dcls", getCheckerActiveDCLs);

// 2. My Queue (Checker assigned)
router.get("/my-queue/:checkerId", getCheckerMyQueue);

// 3. Completed DCLs for Checker (Approved)
router.get("/completed/:checkerId", getCompletedDCLsForChecker); // updated endpoint

// 4. Get Single DCL
router.get("/dcl/:id", getCheckerDclById);

// 5. Update DCL Status (old API remains)
router.put("/dcl/:id", updateCheckerDclStatus);

// 6. Auto-Move My Queue → Completed
router.get("/my-queue-auto/:checkerId", getAutoMovedCheckerMyQueue);

router.patch(
  "/update-status",
  protect,
  updateCheckerStatus
);

// 7. Reports dashboard metrics
router.get("/reports/:checkerId", getCheckerReports);

// -------------------------------------------
// NEW APIS (8 & 9)
// Notification-based Approve / Reject DCL
// -------------------------------------------

// 8. Approve DCL (with notifications)
router.patch("/approve/:id", approveCheckerDclWithNotification);

// 9. Reject DCL (with notifications)
router.patch("/reject/:id", rejectCheckerDclWithNotification);

export default router;
