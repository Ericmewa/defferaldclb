// models/Deferral.js
import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    name: String,
    url: String,
    type: String,
    size: Number,
    uploadDate: Date,
    isDCL: { type: Boolean, default: false },
    isAdditional: { type: Boolean, default: false },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: true }
);

// Schema for documents that are "selected" as part of a deferral (e.g. "Customer Identification Documents" with selected items like "KRA")
const selectedDocumentSchema = new mongoose.Schema(
  {
    name: String,
    type: String,
    items: [String],
  },
  { _id: false }
);

const facilitySchema = new mongoose.Schema(
  {
    type: String,
    sanctioned: Number,
    balance: Number,
    headroom: Number,
  },
  { _id: false }
);

const approverSchema = new mongoose.Schema(
  {
    name: String,
    approved: { type: Boolean, default: false },
    approvedAt: Date,
  },
  { _id: false }
);

const deferralSchema = new mongoose.Schema(
  {
    deferralNumber: { type: String, unique: true },

    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    customerNumber: String,
    customerName: String,
    businessName: String,

    loanType: String,

    deferralTitle: String,
    loanAmount: Number,
    daysSought: Number,
    nextDocumentDueDate: Date,
    deferralDescription: String,

    dclNumber: String,

    facilities: [facilitySchema],
    documents: [documentSchema],
    additionalDocuments: [documentSchema],
    selectedDocuments: [selectedDocumentSchema],

    comments: [
      {
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        text: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // History of actions taken on this deferral (approvals, rejections, reminders, comments)
    history: [
      {
        action: String, // e.g. 'approved', 'rejected', 'reminder', 'comment'
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        userName: String,
        notes: String,
        date: { type: Date, default: Date.now },
      },
    ],

    approvers: [
      {
        role: String,
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        approved: { type: Boolean, default: false },
        approvedAt: Date,
      },
    ],
    currentApproverIndex: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["pending_approval", "in_review", "approved", "rejected"],
      default: "pending_approval",
    },

    // Who performed the final approval (if completed)
    approvedBy: String,
    approvedById: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedDate: Date,

    // Rejection metadata
    rejectedBy: String,
    rejectedById: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectedDate: Date,

    rejectionReason: String,

    requestor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Deferral", deferralSchema);
