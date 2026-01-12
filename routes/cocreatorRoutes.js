// routes/cocreatorRoutes.js
import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { uploadSingle } from "../middleware/upload.js";

import {
  createChecklist,
  getAllCoCreatorChecklists,
  getSpecificChecklistsByCreator,
  getCoCreatorChecklistById,
  getCoCreatorChecklistByDclNo,
  getCoCreatorActiveChecklists,
  updateChecklistByCoCreator,
  coCreatorSubmitToRM,
  submitToCoChecker,
  coCreatorReview,
  coCheckerApproval,
  coCreatorAddDocument,
  coCreatorUpdateDocument,
  deleteDocument,
  updateDocumentAdmin,
  searchCustomer,
  uploadDocumentFile,
  updateCoCreatorChecklistStatus,
  getChecklists,
  updateChecklistStatus,
  getChecklistComments,
  uploadSupportingDocs,
  downloadChecklist
  // import { getChecklists } from "../controllers/checklistController.js";
} from "../controllers/cocreatorController.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// --- Creation & General Info ---
router.post("/", protect, authorizeRoles("cocreator"), createChecklist);
router.get("/", getAllCoCreatorChecklists);
// router.get("/dcls", protect, getDCLs);
router.get("/:id", protect, getCoCreatorChecklistById);
router.get("/dcl/:dclNo", protect, getCoCreatorChecklistByDclNo);
router.put(
  "/:id",
  protect,
  authorizeRoles(["cocreator", "rm", "coChecker"]),
  updateChecklistByCoCreator
);

// Route: GET /api/checklists/:checklistId/comments
router.get('/:checklistId/comments', protect, getChecklistComments);

// Get all checklists
router.get("/", getChecklists);
// Search customers by query string
// Example request: GET /api/cocreatorChecklist/search/customer?q=12345
router.get("/search/customer", protect, searchCustomer);
// SPECIFIC CHECKLIST
router.get("/creator/:creatorId", getSpecificChecklistsByCreator);

// --- Workflow ---
router.put("/:id/co-create", protect, coCreatorReview);
router.put("/:id/co-check", protect, coCheckerApproval);

// --- Admin Document Override ---
router.put("/update-document", protect, updateDocumentAdmin);

/**
 * RM → Submit checklist to Co-Checker
 */
router.patch(
  "/update-status",
  protect, // optional but recommended
  updateChecklistStatus
);

// --- Submissions ---
router.post(
  "/:id/submit-to-rm",
  protect,
  authorizeRoles("cocreator"),
  coCreatorSubmitToRM
);
router.post("/:id/submit-to-cochecker", protect, submitToCoChecker);

// PATCH /api/cocreatorChecklist/:checklistId/checklist-status
router.patch(
  "/:checklistId/checklist-status",
  protect,
  updateCoCreatorChecklistStatus
);

// --- Document Handling ---
router.post(
  "/:id/documents",
  protect,
  authorizeRoles(["cocreator", "rm"]),
  coCreatorAddDocument
);
router.patch(
  "/:id/documents/:docId",
  protect,
  authorizeRoles(["cocreator", "rm"]),
  coCreatorUpdateDocument
);
router.delete(
  "/:id/documents/:docId",
  protect,
  authorizeRoles(["rm", "cocreator"]),
  deleteDocument
);

// GET CUSTOMERS

router.get("/search/customer", searchCustomer);

// ------------------------------
// 🟢 GET ACTIVE CHECKLISTS (Co-Creator)
// ------------------------------
router.get("/cocreator/active", getCoCreatorActiveChecklists);

// --- Uploads ---
router.post(
  "/:id/documents/:docId/upload",
  protect,
  authorizeRoles(["cocreator", "rm"]),
  uploadSingle("file"),
  uploadDocumentFile
);

// upload amd download of documents


// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join("uploads", req.params.id);
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Upload endpoint
router.post("/:id/upload", upload.array("files"), uploadSupportingDocs);

// Download endpoint
router.get("/:id/download", downloadChecklist);

export default router;
