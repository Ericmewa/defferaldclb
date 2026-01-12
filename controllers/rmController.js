import {
  // getRMQueueDCLs,
  // getRMCompletedDCLs,
  deleteDCL,
} from "../services/rmServices.js";
import Checklist from "../models/Checklist.js";
// import { addLog } from "../utils/logger.js";
import Notification from "../models/Notification.js";
import asyncHandler from "express-async-handler";

export const removeDCL = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await deleteDCL(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "DCL not found",
      });
    }

    res.json({
      success: true,
      message: "DCL deleted successfully",
    });
  } catch (error) {
    console.error("Delete DCL Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get my queue

export const getMyQueue = async (req, res) => {
  try {
    const { rmId } = req.params;

    console.log("🔥 RM ID received:", rmId);

    if (!rmId) {
      return res.status(400).json({ message: "rmId is required" });
    }

    const checklists = await Checklist.find({
      assignedToRM: rmId,
      status: { $in: ["Pending from Rm", "submitted"] },
    })
      .populate("createdBy", "name email")
      .populate("assignedToRM", "name email")
      .sort({ createdAt: -1 });

    console.log("🔥 Fetched RM Queue Count:", checklists.length);

    res.json(checklists);
  } catch (err) {
    console.error("🔥 ERROR in getMyQueue:", err);
    res.status(500).json({
      message: "Server Error",
      error: err.message,
      stack: err.stack,
    });
  }
};

// Rm submit Dcl to co-creator

// import Checklist from "../models/Checklist.js";

// export const rmSubmitChecklistToCoCreator = async (req, res) => {
//   try {
//     const { checklistId, documents, rmGeneralComment } = req.body;

//     if (!checklistId) {
//       return res.status(400).json({ error: "Checklist ID is required" });
//     }

//     const checklist = await Checklist.findById(checklistId);
//     if (!checklist) {
//       return res.status(404).json({ error: "Checklist not found" });
//     }

//     /* ============================
//        1. Update documents
//     ============================ */
//     if (Array.isArray(documents)) {
//       documents.forEach((updatedDoc) => {
//         const category = checklist.documents.find(
//           (c) => c.category === updatedDoc.category
//         );
//         if (!category) return;

//         const doc = category.docList.id(updatedDoc._id);
//         if (!doc) return;

//         if (updatedDoc.status === "pendingrm") {
//           // If the frontend status is 'pendingrm', change it to 'submitted_for_review'
//           doc.status = "submitted";
//         } else if (updatedDoc.status !== undefined) {
//           // Otherwise, if a status is provided, use it directly
//           doc.status = updatedDoc.status;
//         }

//         doc.action = updatedDoc.action;
//         doc.comment = updatedDoc.comment;
//         doc.fileUrl = updatedDoc.fileUrl;
//         doc.deferralReason = updatedDoc.deferralReason;
//         doc.deferralNumber = updatedDoc.deferralNumber;
//         doc.rmStatus = updatedDoc.rmStatus;
//       });
//     }

//     /* ============================
//        2. RM general comment log
//     ============================ */
//     if (rmGeneralComment) {
//       checklist.logs.push({
//         message: `RM Comment: ${rmGeneralComment}`,
//         userId: req.user.id,
//         role: "RM",
//         timestamp: new Date(),
//       });
//     }

//     /* ============================
//        3. Move checklist to Co-Creator
//     ============================ */
//     checklist.status = "co_creator_review";
//     checklist.submittedBackToCoCreator = true;

//     checklist.logs.push({
//       message: "Checklist submitted back to Co-Creator by RM",
//       userId: req.user.id,
//       role: "RM",
//       timestamp: new Date(),
//     });

//     await checklist.save();

//     res.json({
//       message: "Checklist successfully submitted to Co-Creator",
//       checklist,
//     });
//   } catch (err) {
//     console.error("RM SUBMIT TO CO-CREATOR ERROR:", err);
//     res.status(500).json({ error: err.message });
//   }
// };

// import Checklist from "../models/Checklist.js"; // adjust import path

export const rmSubmitChecklistToCoCreator = async (req, res) => {
  try {
    const { checklistId, documents, rmGeneralComment } = req.body;

    if (!checklistId) {
      return res.status(400).json({ error: "Checklist ID is required" });
    }

    const checklist = await Checklist.findById(checklistId);
    if (!checklist) {
      return res.status(404).json({ error: "Checklist not found" });
    }

    /* ===========================
       1. Update documents (RM only)
       ✅ Do NOT overwrite CO-Creator status
    =========================== */
    if (Array.isArray(documents)) {
      documents.forEach((updatedDoc) => {
        const category = checklist.documents.find(
          (c) => c.category === updatedDoc.category
        );
        if (!category) return;

        const doc = category.docList.id(updatedDoc._id);
        if (!doc) return;

        // Only RM fields
        if (updatedDoc.action !== undefined) doc.action = updatedDoc.action;
        if (updatedDoc.rmStatus !== undefined)
          doc.rmStatus = updatedDoc.rmStatus;
        if (updatedDoc.comment !== undefined) doc.comment = updatedDoc.comment;
        if (updatedDoc.fileUrl !== undefined) doc.fileUrl = updatedDoc.fileUrl;
        if (updatedDoc.deferralReason !== undefined)
          doc.deferralReason = updatedDoc.deferralReason;
        if (updatedDoc.deferralNumber !== undefined)
          doc.deferralNumber = updatedDoc.deferralNumber;
      });
    }

    /* ===========================
       2. RM general comment log
    =========================== */
    if (rmGeneralComment) {
      checklist.logs.push({
        message: `RM Comment: ${rmGeneralComment}`,
        userId: req.user.id,
        role: "RM",
        timestamp: new Date(),
      });
    }

    /* ===========================
       3. Move checklist to Co-Creator
    =========================== */
    checklist.status = "co_creator_review";
    checklist.submittedBackToCoCreator = true;

    checklist.logs.push({
      message: "Checklist submitted back to Co-Creator by RM",
      userId: req.user.id,
      role: "RM",
      timestamp: new Date(),
    });

    await checklist.save();

    res.json({
      message: "Checklist successfully submitted to Co-Creator",
      checklist,
    });
  } catch (err) {
    console.error("RM SUBMIT TO CO-CREATOR ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// RM GET ALL COMPLETED DCLS

// export const getRMCompleted = async (req, res) => {
//   try {
//     const { rmId } = req.params;
//     const data = await getRMCompletedDCLs(rmId);

//     res.json({
//       success: true,
//       count: data.length,
//       data,
//     });
//   } catch (error) {
//     console.error("Completed load error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// RM SUBMISSION TO CO CREATOR – update document statuses

// export const submitChecklistToCoCreator = async (req, res) => {
//   try {
//     const { checklistId, documents, rmGeneralComment, rmId } = req.body;

//     if (!checklistId || !documents || !Array.isArray(documents)) {
//       return res.status(400).json({ error: "Invalid request payload" });
//     }

//     const checklist = await Checklist.findById(checklistId);
//     if (!checklist)
//       return res.status(404).json({ error: "Checklist not found" });

//     // UPDATE NESTED DOCUMENTS

//     checklist.documents.forEach((cat) => {
//       cat.docList.forEach((doc) => {
//         const incoming = documents.find((d) => d._id == doc._id);
//         if (!incoming) return;

//         doc.status = incoming.status ?? doc.status;
//         doc.comment = incoming.comment ?? doc.comment;
//         doc.action = incoming.action ?? doc.action;
//         doc.fileUrl = incoming.fileUrl ?? doc.fileUrl;
//         doc.deferralReason = incoming.deferralReason ?? doc.deferralReason;
//         doc.rmStatus = incoming.rmStatus ?? doc.rmStatus;

//         doc.updatedAt = new Date();
//       });
//     });

//     // ===============================
//     // RM GENERAL COMMENT + WORKFLOW
//     // ===============================
//     checklist.rmGeneralComment = rmGeneralComment ?? "";
//     checklist.rmReviewedBy = rmId || null;
//     checklist.status = "co_creator_review";

//     const updatedChecklist = await checklist.save();

//     return res.json({
//       message: "Checklist submitted successfully!",
//       checklist: updatedChecklist, // ⭐ Return updated result
//     });
//   } catch (err) {
//     console.error("SUBMIT RM ERROR:", err);
//     return res.status(500).json({ error: err.message });
//   }
// };

// ---------------------------------------------
// GET CHECKLIST BY ID
// ---------------------------------------------
export const getChecklistById = async (req, res) => {
  try {
    const checklist = await Checklist.findById(req.params.id)
      .populate("assignedToRM", "name email")
      .populate("createdBy", "name email");

    if (!checklist)
      return res.status(404).json({ error: "Checklist not found" });

    res.json(checklist);
  } catch (err) {
    console.error("GET CHECKLIST ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

//DELETE UPLOADED FILE
export const deleteDocumentFile = asyncHandler(async (req, res) => {
  const { checklistId, documentId } = req.params;

  const checklist = await Checklist.findById(checklistId);
  if (!checklist) throw new Error("Checklist not found");

  const doc = checklist.documents.id(documentId);
  if (!doc) throw new Error("Document not found");

  doc.fileUrl = null;
  await checklist.save();

  res.json({ message: "File deleted successfully" });
});

// RM NOTIFICATIONS
export const getRmNotifications = async (req, res) => {
  const { userId } = req.query;
  const notifications = await Notification.find({ userId }).sort({
    createdAt: -1,
  });
  res.json(notifications);
};

// Mark notification as read
export const markRmNotificationsAsRead = async (req, res) => {
  const { notificationId } = req.params;
  const notification = await Notification.findByIdAndUpdate(
    notificationId,
    { isRead: true },
    { new: true }
  );
  res.json(notification);
};

//completed dcls

export const getCompletedDclsForRm = async (req, res) => {
  try {
    const { rmId } = req.params;

    const completed = await Checklist.find({
      status: "Approved",
      assignedToRM: rmId, // 👈 filter by RM
    }).sort({ updatedAt: -1 });

    res.json(completed);
  } catch (err) {
    console.error("Error fetching completed DCLs:", err);
    res.status(500).json({ message: "Server Error" });
  }
};
