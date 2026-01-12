import express from "express";
import {
  getMyQueue,
  removeDCL,
  //   submitChecklistToCoCreator,
  deleteDocumentFile,
  getChecklistById,
  getRmNotifications,
  markRmNotificationsAsRead,
  getCompletedDclsForRm,
  rmSubmitChecklistToCoCreator,
} from "../controllers/rmController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// RM Queue = in progress
router.get("/:rmId/myqueue", getMyQueue);

// Rm submits checklist to co creator

// rmSubmitChecklistToCoCreator
/**
 * RM → Co-Creator submission
 */
router.post(
  "/rm-submit-to-co-creator",
  protect,
  // ensures req.user exists
  rmSubmitChecklistToCoCreator
);

//  rm submit checklist to cocreator
// router.post("/submitChecklistToCoCreator", submitChecklistToCoCreator);

//Rm get  Completed Dcls = approved

router.get("/completed/rm/:rmId", getCompletedDclsForRm);

// DELETE a DCL
router.delete("/:id", removeDCL);

// ✅ Get checklist by ID
router.get("/:id", getChecklistById);

// ✅ Delete uploaded file for a document inside a checklist
router.delete("/:checklistId/document/:documentId", deleteDocumentFile);

/* ----------------------- RM NOTIFICATIONS ROUTES ----------------------- */

// ✅ Get notifications for RM
router.get("/notifications/rm", getRmNotifications);
// usage: /api/checklist/notifications/rm?userId=123

// ✅ Mark a notification as read
router.put("/notifications/rm/:notificationId", markRmNotificationsAsRead);

export default router;
