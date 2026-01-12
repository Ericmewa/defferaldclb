import express from "express";
import { searchCustomer } from "../controllers/customerController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.post("/search", protect, searchCustomer);

export default router;
