import { Router } from "express";
import {
  requestDeferral,
  getPendingDeferrals,
  approveDeferral,
  rejectDeferral,
  getApprovedDeferrals,
  getRejectedDeferrals,
} from "../controllers/deferral.controller.js";

const router = Router();

// Request deferral (CO)
router.post("/request", requestDeferral);

// Pending deferrals (RM & CO)
router.get("/pending", getPendingDeferrals);

// Approve a deferral (RM)
router.patch("/approve/:id", approveDeferral);

// Reject a deferral (RM)
router.patch("/reject/:id", rejectDeferral);

// Completed/approved deferrals
router.get("/approved", getApprovedDeferrals);

// Optional rejected list
router.get("/rejected", getRejectedDeferrals);

export default router;
