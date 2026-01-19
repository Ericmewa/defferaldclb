import express from "express";
import { searchCustomer, searchByDcl } from "../controllers/customerController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.post("/search", protect, searchCustomer);
router.get("/search-dcl", protect, searchByDcl);

export default router;

