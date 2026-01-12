// // routes/checklistRoutes.js

// import express from "express";
// import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
// import multer from "multer"; // Still needed for middleware
// import { upload } from "../middleware/upload.js"; // File upload middleware

// // 1. Import RM-specific/General actions from the main controller
// import {
//   uploadDocuments,
//   deferDocument,
//   getRmQueue,
//   getChecklistsForRM,
//   submitRmChecklist,
//   requestDeferral,
//   submitChecklistToCoCreator,
//   uploadDocument,
// } from "../controllers/checklistController.js";

// // 2. Import Co-Creator/Admin/General actions from the Co-Creator controller
// import {
//   createChecklist,
//   coCreatorReview,
//   getChecklists,
//   getChecklistById,
//   getChecklistByDclNo,
//   coCheckerApproval,
//   updateDocumentAdmin,
//   updateChecklist,
//   getDashboardStats,
//   searchCustomer,
//    updateDocumentStatus,
//   updateChecklistStatus,
// } from "../controllers/coCreator.js";
// import { updateChecklistStatus } from "../controllers/statusController.js";

// const router = express.Router();

// /* ==========================================================================
//    GENERAL & CO-CREATOR/ADMIN ROUTES
//    ========================================================================== */

// // Creation & General Info Retrieval
// router.post("/", protect, authorizeRoles("cocrerator"), createChecklist);
// // router.post("/" ,gyjhjvhghnb) // Only Co-Creator/Admin should create
// router.put("/:id", protect, updateChecklist); // Admin update (e.g., required docs)

// router.get("/dashboard/stats", protect, getDashboardStats);
// router.get("/id/:id", protect, getChecklistById); // GET by MongoDB _id
// router.get("/dcl/:dclNo", protect, getChecklistByDclNo);
// router.get("/", getChecklists); // GET Master List

// // SEARCH A CUSTOMER
// router.get("/search", searchCustomer);

// // Admin/Reviewer Workflow Actions
// router.put("/update-document", protect, updateDocumentAdmin); // <- FIX: Admin override
// router.put("/:id/co-create", protect, coCreatorReview);
// router.put("/:id/co-check", protect, coCheckerApproval);

// // Used for transitions like "Submit to Checker" where documents and status change
// router.patch("/:id/checklist-status", protect, updateChecklistStatus);

// /* ==========================================================================
//    RM-SPECIFIC ROUTES
//    ========================================================================== */

// // Document Handling
// router.post(
//   "/upload",
//   protect,
//   upload.single("file"), // Multer middleware
//   uploadDocument // Single document upload by RM
// );
// router.put("/:id/upload", protect, uploadDocuments); // Batch document upload/update

// // Deferral
// router.post("/deferral", protect, requestDeferral);
// router.put("/:id/defer", protect, deferDocument);

// // RM Submission
// router.patch("/rm-submit", submitChecklistToCoCreator); // Submit checklist to Co-Creator
// router.post("/rm-submit-legacy", protect, submitRmChecklist); // Legacy/alternative RM submit

// // RM Queues/Retrieval
// router.get(
//   "/rm/my-checklists",
//   // authorizeRoles("rm"),
//   getChecklistsForRM // All checklists assigned to the logged-in RM
// );

// // update checklists
// router.put("/document", auth, updateDocumentStatus);
// router.put("/status/:id", auth, updateChecklistStatus);

// router.get("/:rmId", protect, getRmQueue); // Get RM queue (by ID in params - less secure)

// export default router;
