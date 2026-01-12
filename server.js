import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import logRoutes from "./routes/logRoutes.js";
import path from "path";
import coCreatorRoutes from "./routes/cocreatorRoutes.js";
import rmRoutes from "./routes/rmRoutes.js";
import checkerRoutes from "./routes/checkerRoutes.js";
import deferralRoutes from "./routes/deferralRoutes.js";

dotenv.config();
connectDB();

const app = express();
app.use(
  cors({ origin: "*", methods: ["GET", "POST", "PUT", "PATCH", "DELETE"] })
);

app.use(express.json());
// app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// routes
app.use("/api/checklist", coCreatorRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/user-logs", logRoutes);
app.use("/api/checkerChecklist", checkerRoutes);
app.use("/api/rmChecklist", rmRoutes);
app.use("/api/cocreatorChecklist", coCreatorRoutes);

// Customer lookup (core banking/mock)
import customerRoutes from "./routes/customerRoutes.js";
app.use("/api/customers", customerRoutes);

// Defferals

   // RM routes
app.use("/api/rms", userRoutes);

// defferal routes
app.use("/api/deferrals", deferralRoutes);

app.listen(process.env.PORT || 8000, () =>
  console.log(`✅ Server running on port ${process.env.PORT || 8000}`)
);
