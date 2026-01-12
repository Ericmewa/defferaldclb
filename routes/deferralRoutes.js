import express from "express";
import {
  createDeferral,
  getPendingDeferrals,
  getApproverQueue,
  getActionedDeferrals,
  getMyDeferrals,
  getDeferral,
  addComment,
  getComments,
  updateFacilities,
  addDocument,
  deleteDocument,
  setApprovers,
  removeApprover,
  approveDeferral,
  rejectDeferral,
  getApprovedDeferrals,
  generatePDF,
  getNextDeferralNumber,
  seedDeferrals,
  debugGetByNumber,
  debugGetDocumentsByNumber,
  debugSearchByDocumentName,  debugCreateApproved,  uploadDocument
} from "../controllers/deferralController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", protect, createDeferral);
router.get("/pending", protect, getPendingDeferrals);
router.get("/approver/queue", protect, getApproverQueue);
router.get("/approver/actioned", protect, getActionedDeferrals);
router.get("/my", protect, getMyDeferrals);
router.get("/preview-number", getNextDeferralNumber);
router.get("/approved", protect, getApprovedDeferrals);
router.get("/:id", protect, getDeferral);

// DEBUG: Temporary route to get by deferral number (for troubleshooting only)
router.get("/debug/by-number/:number", protect, debugGetByNumber);
// Public debug (no auth) - development only
router.get("/debug/public/by-number/:number", debugGetByNumber);
// Public debug: documents only (dev only)
router.get("/debug/public/by-number/:number/documents", debugGetDocumentsByNumber);
// Public debug: search deferrals by attached document name (e.g., ?name=logbook.pdf)
router.get("/debug/public/search/documents", debugSearchByDocumentName);

// Dev-only seed endpoint (admin only)
router.post("/seed", protect, authorizeRoles('admin'), seedDeferrals);

// Dev-only debug: create an approved deferral for testing (no auth) -- NOT FOR PRODUCTION
router.post("/debug/force-approved", debugCreateApproved);
// Dev-only public view of approved deferrals (no auth) for testing
router.get("/debug/public/approved", getApprovedDeferrals);

// Comments
router.post("/:id/comments", protect, addComment);
router.get("/:id/comments", protect, getComments);

router.put("/:id/facilities", protect, updateFacilities);

router.post("/:id/documents", protect, addDocument);
// Multipart upload endpoint for attaching files
import { uploadSingle } from "../middleware/upload.js";
router.post("/:id/documents/upload", protect, uploadSingle('file'), uploadDocument);
router.delete("/:id/documents/:docId", protect, deleteDocument);

router.put("/:id/approvers", protect, setApprovers);
router.delete("/:id/approvers/:index", protect, removeApprover);

router.put("/:id/approve", protect, approveDeferral);
router.put("/:id/reject", protect, rejectDeferral);

// Approved deferrals (CO view)
// (moved earlier to avoid collision with /:id route)

router.get("/:id/pdf", protect, generatePDF);

// generate pdf
router.get("/:id/pdf", protect, generatePDF);


export default router;
