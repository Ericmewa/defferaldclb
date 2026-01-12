import Checklist from "../models/Checklist.js";
import { addLog, generateDclNumber } from "../helpers/checklistHelpers.js";
import { findLeastBusyCheckerId } from "../utils/findLeastBusyChecker.js";
import fs from "fs";
import path from "path";
import asyncHandler from "express-async-handler";

import archiver from "archiver";
// import Checklist from "../models/Checklist.js";

// create a checklist
export const createChecklist = async (req, res) => {
  try {
    const {
      customerId,
      customerNumber,
      customerName,
      loanType,
      assignedToRM,
      documents, // [{ category, _id }]
    } = req.body;

    // Generate DCL number
    const dclNo = await generateDclNumber();

    // Prepare documents array with uploaded files
    const checklistDocuments = documents.map((cat) => {
      // We map over the documents *inside* the category to assign files
      const docListWithFiles = cat.docList.map((doc) => {
        // ASSUMPTION: The file fieldname is the document's name (e.g., "Loan Agreement")
        const uploadedFile = (req.files || []).find(
          (file) => file.fieldname === doc.name
        );

        if (uploadedFile) {
          return {
            ...doc,
            fileUrl: `/uploads/${uploadedFile.filename}`,
            // We don't overwrite the document name here, only add the file info
            status: "submitted",
          };
        }
        return doc; // Return the document as is if no file was uploaded
      });

      return {
        ...cat,
        docList: docListWithFiles, // The full list of documents, some with file info
      };
    });

    // Create checklist
    const checklist = await Checklist.create({
      dclNo,
      customerId,
      customerNumber,
      customerName,
      loanType,
      assignedToRM,
      createdBy: req.user._id,
      documents: checklistDocuments,
    });

    res.status(201).json({
      message: "Checklist created successfully",
      checklist,
    });
  } catch (err) {
    console.log("CREATE CHECKLIST ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// comments trail

// / @desc   Get the comment/activity log trail for a specific checklist
// @route GET /api/checklists/:checklistId/comments
// @access Private (e.g., Creator, RM, Co-Checker)
export const getChecklistComments = asyncHandler(async (req, res) => {
  const { checklistId } = req.params;
  const userId = req.user._id.toString(); // 1. Authorization and Data Fetch // We fetch the checklist and populate the user details within the logs.

  const checklist = await Checklist.findById(checklistId)
    .populate("createdBy", "name role")
    .populate("assignedToRM", "name role")
    .populate("assignedToCoChecker", "name role")
    .populate("logs.userId", "name role"); // ⭐ Populate the User details within the logs

  if (!checklist) {
    res.status(404);
    throw new Error("Checklist not found");
  } // 2. Authorization Check: Verify user role against the checklist assignments.

  const isAuthorized =
    checklist.createdBy._id.toString() === userId ||
    checklist.assignedToRM._id.toString() === userId ||
    (checklist.assignedToCoChecker &&
      checklist.assignedToCoChecker._id.toString() === userId);

  if (!isAuthorized) {
    res.status(403);
    throw new Error("Not authorized to view this comment trail.");
  } // 3. Format and Send the Logs // We can reformat the logs slightly to match the expected structure if needed, // but simply sending the populated logs is often sufficient. // Optional: Sort the logs by timestamp descending (newest first)

  const sortedLogs = [...checklist.logs].sort(
    (a, b) => b.timestamp - a.timestamp
  );

  res.status(200).json(sortedLogs);
});

// search  a customer
export const searchCustomer = async (req, res) => {
  try {
    const q = req.query.q || "";

    const results = await Customer.find({
      customerNumber: { $regex: q, $options: "i" },
    }).limit(10);

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//  Get all checklists
export const getChecklists = async (req, res) => {
  try {
    const checklists = await Checklist.find()
      .populate("createdBy", "name email")
      .populate("assignedToRM", "name email")
      .populate("assignedToCoChecker", "name email")
      // .sort({ createdAt: -1 });
      .sort({ createdAt: -1, _id: -1 });

    res.status(200).json(checklists);
  } catch (err) {
    console.error("Error fetching checklists:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

/**
 * Co creator submits checklist to rm (update status & documents)
 * Uses dclNo (NOT _id)
 */
// export const updateChecklistStatus = async (req, res) => {
//   try {
//     const {
//       dclNo,
//       documents,
//       status,
//       submittedToCoChecker,
//       assignedToCoChecker, // Keep this for potential manual override
//       finalComment,
//       attachments,
//     } = req.body;

//     if (!dclNo) {
//       return res.status(400).json({
//         error: "DCL No is required",
//       });
//     }

//     const checklist = await Checklist.findOne({
//       dclNo,
//     });

//     if (!checklist) {
//       return res.status(404).json({
//         error: "Checklist not found",
//       });
//     }

//     /* ================= DOCUMENT UPDATE: RE-GROUPING ================= */
//     if (documents && Array.isArray(documents)) {
//       // ⭐ CORE FIX: Convert the flat document list into the nested category structure.
//       const processedDocuments = documents.reduce((acc, doc) => {
//         const categoryName = doc.category;

//         // 1. Find the existing category object in the accumulator array
//         let categoryObj = acc.find((c) => c.category === categoryName);

//         // 2. If the category doesn't exist, create it
//         if (!categoryObj) {
//           categoryObj = {
//             category: categoryName,
//             docList: [],
//           };
//           acc.push(categoryObj);
//         }

//         // 3. Update the document status to "submitted" (as per previous logic)
//         // const newStatus = "submitted";
//         const newStatus = doc.action || doc.status;
//         const updatedDoc = {
//           ...doc,
//           status: newStatus,
//           // Ensure the _id is kept for existing documents
//           _id: doc._id || new mongoose.Types.ObjectId(),
//         };

//         // 4. Add the updated document to the category's docList
//         categoryObj.docList.push(updatedDoc);

//         return acc;
//       }, []); // Initialize accumulator as an empty array []

//       // Update the checklist documents with the correctly structured array
//       checklist.documents = processedDocuments;

//       // Required since you are replacing the whole nested array
//       checklist.markModified("documents");
//     }
//     /* ================= STATUS UPDATE ================= */
//     // 1. Set the primary status
//     const newStatus = "co_checker_review";
//     checklist.status = newStatus;

//     // 2. ⭐ WORKLOAD ASSIGNMENT LOGIC ⭐
//     if (newStatus === "co_checker_review") {
//       // If the client provided a specific checker ID, use it (manual override).
//       if (assignedToCoChecker) {
//         checklist.assignedToCoChecker = assignedToCoChecker;
//       } else {
//         // Otherwise, auto-assign to the least busy checker.
//         const leastBusyCheckerId = await findLeastBusyCheckerId();

//         if (leastBusyCheckerId) {
//           checklist.assignedToCoChecker = leastBusyCheckerId;
//         } else {
//           // Handle case where no active checkers are found (e.g., log a warning)
//           console.warn(
//             `[Assignment] No active Co-Checkers found for checklist ${dclNo}.`
//           );
//           // You might choose to set assignedToCoChecker to null or leave the status pending assignment
//           // For now, we proceed, but the checklist will be unassigned.
//         }
//       }

//       // Mark submission status
//       checklist.submittedToCoChecker = submittedToCoChecker ?? true;

//       // OPTIONAL: Add a log entry for the assignment
//       if (checklist.assignedToCoChecker) {
//         checklist.logs.push({
//           message: `Assigned to Co-Checker ${checklist.assignedToCoChecker}`,
//           userId: req.user?._id,
//           timestamp: new Date(),
//         });
//       }
//     } else {
//       // If the status is NOT co_checker_review, just use the provided values
//       // Note: Resetting these to null might be appropriate depending on the workflow change.
//       checklist.submittedToCoChecker = submittedToCoChecker ?? false;
//       checklist.assignedToCoChecker = assignedToCoChecker || null;
//     }

//     // 3. Update comments and attachments
//     checklist.finalComment = finalComment || "";
//     checklist.attachments = attachments || [];

//     checklist.lastUpdatedBy = req.user?._id; // if auth middleware exists

//     await checklist.save();

//     res.status(200).json({
//       message: "Checklist successfully submitted to Co-Checker",
//       checklist,
//     });
//   } catch (error) {
//     console.error("Update checklist status error:", error);
//     res.status(500).json({
//       error: "Failed to update checklist status",
//     });
//   }
// };

export const updateChecklistStatus = async (req, res) => {
  try {
    const {
      dclNo,
      documents,
      submittedToCoChecker,
      assignedToCoChecker,
      finalComment,
      attachments,
    } = req.body;

    if (!dclNo) {
      return res.status(400).json({ error: "DCL No is required" });
    }

    const checklist = await Checklist.findOne({ dclNo });

    if (!checklist) {
      return res.status(404).json({ error: "Checklist not found" });
    }

    /* ============================================================
       DOCUMENT UPDATE — PRESERVE CO-CREATOR STATUSES
    ============================================================ */
    if (Array.isArray(documents)) {
      // Flatten existing documents for quick lookup
      const existingDocsMap = new Map();

      checklist.documents?.forEach((cat) => {
        cat.docList.forEach((doc) => {
          existingDocsMap.set(doc._id.toString(), doc);
        });
      });

      const processedDocuments = documents.reduce((acc, doc) => {
        const categoryName = doc.category;

        let categoryObj = acc.find((c) => c.category === categoryName);
        if (!categoryObj) {
          categoryObj = { category: categoryName, docList: [] };
          acc.push(categoryObj);
        }

        const existingDoc = doc._id
          ? existingDocsMap.get(doc._id.toString())
          : null;

        categoryObj.docList.push({
          ...existingDoc,
          ...doc,
          _id: doc._id || new mongoose.Types.ObjectId(),

          // ⭐ CRITICAL FIX
          status: doc.status ?? existingDoc?.status ?? "pending",
        });

        return acc;
      }, []);

      checklist.documents = processedDocuments;
      checklist.markModified("documents");
    }

    /* ============================================================
       STATUS → SUBMIT TO CO-CHECKER
    ============================================================ */
    checklist.status = "co_checker_review";

    if (assignedToCoChecker) {
      checklist.assignedToCoChecker = assignedToCoChecker;
    } else {
      const leastBusyCheckerId = await findLeastBusyCheckerId();
      if (leastBusyCheckerId) {
        checklist.assignedToCoChecker = leastBusyCheckerId;
      }
    }

    checklist.submittedToCoChecker = submittedToCoChecker ?? true;

    /* ============================================================
       COMMENTS / ATTACHMENTS / AUDIT
    ============================================================ */
    checklist.finalComment = finalComment || "";
    checklist.attachments = attachments || [];
    checklist.lastUpdatedBy = req.user?._id;

    if (checklist.assignedToCoChecker) {
      checklist.logs.push({
        message: `Submitted to Co-Checker`,
        userId: req.user?._id,
        timestamp: new Date(),
      });
    }

    await checklist.save();

    res.status(200).json({
      message: "Checklist submitted to Co-Checker successfully",
      checklist,
    });
  } catch (error) {
    console.error("Update checklist status error:", error);
    res.status(500).json({
      error: "Failed to update checklist status",
    });
  }
};

/* ---------------------------
   GET ALL CHECKLISTS CREATED BY ALL CO CREATORS
--------------------------- */
export const getAllCoCreatorChecklists = async (req, res) => {
  try {
    const checklists = await Checklist.find()
      .populate("createdBy", "name email")
      .populate("assignedToRM", "name email")
      .populate("assignedToCoChecker", "name email")
      .sort({ createdAt: -1 });

    res.json(checklists);
  } catch (err) {
    console.error("❌ GET CHECKLISTS ERROR:", err);
    res
      .status(500)
      .json({ message: "Error fetching checklists", error: err.message });
  }
};

//  GET ALL CHECKLISTS CREATED BY A SPECIFIC CO CREATOR

export const getSpecificChecklistsByCreator = async (req, res) => {
  try {
    const { creatorId } = req.params;

    const checklists = await Checklist.find({ createdBy: creatorId })
      .populate("createdBy", "name email")
      .populate("assignedToRM", "name email")
      .sort({ createdAt: -1 });

    res.json(checklists);
  } catch (err) {
    console.error("❌ GET CHECKLISTS BY CREATOR ERROR:", err);
    res.status(500).json({
      message: "Error fetching checklists for creator",
      error: err.message,
    });
  }
};

/* ---------------------------
   GET CHECKLIST BY ID FOR A CREATOR
--------------------------- */
export const getCoCreatorChecklistById = async (req, res) => {
  try {
    const checklist = await Checklist.findById(req.params.id);
    if (!checklist)
      return res.status(404).json({ error: "Checklist not found" });
    res.json(checklist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ---------------------------
   GET CHECKLIST BY DCL NO
--------------------------- */
export const getCoCreatorChecklistByDclNo = async (req, res) => {
  try {
    const { dclNo } = req.params;
    const checklist = await Checklist.findOne({ dclNo });
    if (!checklist)
      return res.status(404).json({ error: "Checklist not found" });
    res.json({ checklist });
  } catch (error) {
    console.error("Error fetching checklist:", error);
    res.status(500).json({ error: error.message });
  }
};

/* ---------------------------
   GET ACTIVE  DCLs FOR CO CREATOR
--------------------------- */
export const getCoCreatorActiveChecklists = async (req, res) => {
  try {
    const active = await Checklist.find({ status: "Active" })
      .select("dclNo status customerName updatedAt")
      .sort({ updatedAt: -1 });

    res.json(active);
  } catch (err) {
    console.error("❌ GET ACTIVE CHECKLISTS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ---------------------------
   GET COMPLETED DCLs FOR CO CREATOR
--------------------------- */

/* ---------------------------
 CO CREATOR   UPDATE  CHECKLIST
--------------------------- */
// export const updateChecklist = async (req, res) => {
//   try {
//     const checklist = await Checklist.findById(req.params.id);
//     if (!checklist)
//       return res.status(404).json({ error: "Checklist not found" });

//     const { documents, status } = req.body;
//     if (documents) checklist.documents = documents;
//     if (status) checklist.status = status;

//     addLog(checklist, "Checklist updated", req.user?.id);
//     await checklist.save();

//     res.json(checklist);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

export const updateChecklistByCoCreator = async (req, res) => {
  try {
    const checklistId = req.params.id;
    const { documents, status, generalComment } = req.body;

    // Fetch the checklist
    const checklist = await Checklist.findById(checklistId);
    if (!checklist)
      return res.status(404).json({ error: "Checklist not found" });

    // ---------------------------
    // 🔐 BUSINESS RULE
    // Co-Creator can update only when RM has returned it
    // (meaning status must be "co_creator_review")
    // ---------------------------
    if (checklist.status !== "co_creator_review") {
      return res.status(403).json({
        error:
          "You can only update this checklist after RM sends it back for correction.",
      });
    }

    // ---------------------------
    // 📄 1. UPDATE DOCUMENTS
    // ---------------------------
    if (documents && Array.isArray(documents)) {
      documents.forEach((updated) => {
        const category = checklist.documents.find(
          (c) => c.category === updated.category
        );

        if (!category) return;

        updated.docList.forEach((docUpdate) => {
          const doc = category.docList.id(docUpdate._id);

          if (!doc) return;

          // Update file if uploaded
          if (docUpdate.fileUrl !== undefined) {
            doc.fileUrl = docUpdate.fileUrl;
          }

          // Update RM comment or Co-Creator comment
          if (docUpdate.comment !== undefined) {
            doc.comment = docUpdate.comment;
          }

          // Update status (pendingrm, submitted, returned, etc.)
          if (docUpdate.status !== undefined) {
            doc.status = docUpdate.status;
          }

          // Add deferral reason if any
          if (docUpdate.deferralReason !== undefined) {
            doc.deferralReason = docUpdate.deferralReason;
          }
        });
      });
    }

    // ---------------------------
    // 🔄 2. Update main checklist status
    // ---------------------------
    if (status) {
      checklist.status = status;
    }

    // ---------------------------
    // 📝 3. Add general comment (Co-Creator)
    // ---------------------------
    if (generalComment) {
      checklist.logs.push({
        message: `Co-Creator comment: ${generalComment}`,
        userId: req.user.id,
        timestamp: new Date(),
      });
    }

    // ---------------------------
    // 🧾 4. Add system log
    // ---------------------------
    checklist.logs.push({
      message: "Checklist updated by Co-Creator",
      userId: req.user.id,
      timestamp: new Date(),
    });

    // Save changes
    await checklist.save();

    res.json({
      message: "Checklist updated successfully",
      checklist,
    });
  } catch (err) {
    console.error("UPDATE CHECKLIST ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ---------------------------
//    SUBMIT TO RM
// --------------------------- */
// export const coCreatorSubmitToRM = async (req, res) => {
//   try {
//     const { creatorComment, documents } = req.body;
//     const updated = await Checklist.findByIdAndUpdate(
//       req.params.id,
//       { documents, status: "rm_review" },
//       { new: true }
//     );
//     res.json(updated);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

export const coCreatorSubmitToRM = async (req, res) => {
  try {
    const checklistId = req.params.id;
    const { creatorComment, documents } = req.body;

    const checklist = await Checklist.findById(checklistId);
    if (!checklist)
      return res.status(404).json({ error: "Checklist not found" });

    // ---------------------------
    // 📄 1. Replace ALL documents with the new array from the payload
    // ---------------------------
    if (documents && Array.isArray(documents)) {
      // ⭐ MODIFICATION: Iterate through the LATEST structure and apply conditional status change
      const processedDocuments = documents.map((category) => {
        // Ensure the category has a docList to iterate over
        if (category.docList && Array.isArray(category.docList)) {
          const processedDocList = category.docList.map((doc) => {
            // ⭐ CORE REQUIREMENT: Conditional status reset
            let newStatus = doc.status;

            // If the status is 'submitted_for_review', roll it back to 'pendingrm'.
            if (doc.status === "submitted_for_review") {
              newStatus = "pendingrm";
            }

            return {
              ...doc,
              // Apply the conditionally updated status, or the original status
              status: newStatus,
            };
          });

          return {
            ...category,
            docList: processedDocList,
          };
        }
        return category; // Return category as is if docList is missing/invalid
      });

      // Assign the newly processed array directly to replace the old one.
      checklist.documents = processedDocuments;

      // Explicitly mark the array as modified to ensure Mongoose saves the change.
      checklist.markModified("documents");
    }
    // Note: If you have file handling (uploads), that needs to happen before save().

    // ---------------------------
    // 📝 2. Add Co-Creator general comment (if provided)
    // ---------------------------
    if (creatorComment) {
      checklist.logs.push({
        message: `Co-Creator comment: ${creatorComment}`,
        userId: req.user.id,
        timestamp: new Date(),
      });
    }

    // ---------------------------
    // 🔄 3. Move checklist to RM Review
    // ---------------------------
    checklist.status = "rm_review";

    // ---------------------------
    // 🧾 4. Add System Log
    // ---------------------------
    checklist.logs.push({
      message: "Checklist submitted to RM for review",
      userId: req.user.id,
      timestamp: new Date(),
    });

    // Save final changes
    await checklist.save();

    res.json({
      message: "Checklist submitted to RM successfully",
      checklist,
    });
  } catch (err) {
    console.error("SUBMIT TO RM ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ---------------------------
   SUBMIT TO CO-CHECKER
// --------------------------- */
// export const submitToCoChecker = async (req, res) => {
//   try {
//     // const { documents, assignedToCoChecker } = req.body;
//     const {} = req.body;
//     const updated = await Checklist.findByIdAndUpdate(
//       req.params.id,
//       {
//         documents,
//         status: "co_checker_review",
//         submittedToCoChecker: true,
//         assignedToCoChecker,
//       },
//       { new: true }
//     );
//     res.json(updated);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// export const submitToCoChecker = async (req, res) => {
//   const { documents, supportingDocs, coGeneralComment } = req.body || {};

//   try {
//     const checklist = await Checklist.findById(req.params.id);
//     if (!checklist)
//       return res.status(404).json({ message: "Checklist not found" });

//     // Example update
//     checklist.documents = documents;
//     checklist.supportingDocs = supportingDocs;
//     checklist.creatorComment = creatorComment;
//     checklist.status = "Submitted";

//     await checklist.save();

//     res
//       .status(200)
//       .json({ message: "Checklist submitted to Co-Checker", checklist });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server Error" });
//   }
// };

//  CO-CREATOR REVIEW

export const coCreatorReview = async (req, res) => {
  try {
    const { checklistId } = req.params;
    const { reviewedBy } = req.body;

    const updatedChecklist = await Checklist.findByIdAndUpdate(
      checklistId,
      {
        status: "co_creator_review",
        coCreatorReviewedBy: reviewedBy || null,
        reviewedOn: new Date(),
      },
      { new: true }
    );

    if (!updatedChecklist)
      return res.status(404).json({ error: "Checklist not found" });

    res.json({
      message: "Checklist sent for Co-Creator review",
      checklist: updatedChecklist,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// upload and download

// ================================
// Upload Additional Files
// ================================
export const uploadSupportingDocs = async (req, res) => {
  try {
    const checklist = await Checklist.findById(req.params.id);
    if (!checklist)
      return res.status(404).json({ message: "Checklist not found" });

    const uploadedFiles = req.files.map((file) => ({
      fileName: file.originalname,
      fileUrl: `/uploads/${req.params.id}/${file.filename}`,
      uploadedAt: new Date(),
      uploadedBy: req.user.id,
    }));

    checklist.supportingDocs = checklist.supportingDocs
      ? checklist.supportingDocs.concat(uploadedFiles)
      : uploadedFiles;

    await checklist.save();

    res.status(200).json({
      message: "Files uploaded successfully",
      files: uploadedFiles,
      checklist,
    });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// ================================
// Download Checklist + Supporting Docs as ZIP
// ================================
export const downloadChecklist = async (req, res) => {
  try {
    const checklist = await Checklist.findById(req.params.id);
    if (!checklist)
      return res.status(404).json({ message: "Checklist not found" });

    const archive = archiver("zip", { zlib: { level: 9 } });

    res.attachment(`Checklist-${checklist.dclNo || checklist._id}.zip`);
    archive.pipe(res);

    // Add main checklist documents
    checklist.documents.forEach((category) => {
      category.docList.forEach((doc) => {
        if (doc.fileUrl) {
          const filePath = path.join(".", doc.fileUrl);
          if (fs.existsSync(filePath)) {
            archive.file(filePath, {
              name: `Documents/${category.category}/${doc.name}`,
            });
          }
        }
      });
    });

    // Add supporting docs
    if (checklist.supportingDocs && checklist.supportingDocs.length > 0) {
      checklist.supportingDocs.forEach((doc) => {
        const filePath = path.join(".", doc.fileUrl);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: `SupportingDocs/${doc.fileName}` });
        }
      });
    }

    await archive.finalize();
  } catch (err) {
    console.error("Download Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

export const submitToCoChecker = async (req, res) => {
  const { documents, supportingDocs, coGeneralComment } = req.body || {};

  try {
    const checklist = await Checklist.findById(req.params.id);
    if (!checklist)
      return res.status(404).json({ message: "Checklist not found" });

    // 1️⃣ Validate if all docs are allowed to be submitted
    const hasPendingRM = checklist.documents.some((cat) =>
      cat.docList.some((doc) => doc.status === "pendingrm")
    );
    if (hasPendingRM) {
      return res.status(400).json({
        message:
          "Checklist contains documents still pending RM. Cannot submit to Co-Checker.",
      });
    }

    // 2️⃣ Update only changed fields from Co-Checker
    if (Array.isArray(documents)) {
      documents.forEach((updatedDoc) => {
        const category = checklist.documents.find(
          (c) => c.category === updatedDoc.category
        );
        if (!category) return;

        const doc = category.docList.id(updatedDoc._id);
        if (!doc) return;

        // Only update what is explicitly changed, keep original status
        if (updatedDoc.action !== undefined) doc.action = updatedDoc.action;
        if (updatedDoc.comment !== undefined) doc.comment = updatedDoc.comment;
        if (updatedDoc.fileUrl !== undefined) doc.fileUrl = updatedDoc.fileUrl;
        if (updatedDoc.deferralReason !== undefined)
          doc.deferralReason = updatedDoc.deferralReason;
      });
    }

    // 3️⃣ Update supporting docs if any
    if (supportingDocs !== undefined) {
      checklist.supportingDocs = supportingDocs;
    }

    // 4️⃣ Log Co-Checker general comment
    if (coGeneralComment) {
      checklist.logs.push({
        message: `Co-Checker Comment: ${coGeneralComment}`,
        userId: req.user.id,
        role: "Co-Checker",
        timestamp: new Date(),
      });
    }

    // 5️⃣ Set checklist status to indicate Co-Checker reviewed
    // ✅ Important: Do NOT overwrite individual document statuses
    checklist.status = "co_checker_reviewed";

    await checklist.save();

    res
      .status(200)
      .json({ message: "Checklist submitted to Co-Checker", checklist });
  } catch (err) {
    console.error("Submit to Co-Checker Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

//  CO-CHECKER APPROVAL
export const coCheckerApproval = async (req, res) => {
  try {
    const { checklistId } = req.params;
    const { approvedBy } = req.body;

    const updatedChecklist = await Checklist.findByIdAndUpdate(
      checklistId,
      {
        status: "completed",
        coCheckerApprovedBy: approvedBy || null,
        completedOn: new Date(),
      },
      { new: true }
    );

    if (!updatedChecklist)
      return res.status(404).json({ error: "Checklist not found" });

    res.json({
      message: "Checklist approved by Co-Checker",
      checklist: updatedChecklist,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ---------------------------
   DOCUMENT HANDLING
--------------------------- */
export const coCreatorAddDocument = async (req, res) => {
  try {
    const { category, doc } = req.body;
    const checklist = await Checklist.findById(req.params.id);
    if (!checklist)
      return res.status(404).json({ error: "Checklist not found" });

    let categoryObj = checklist.documents.find((c) => c.category === category);
    if (!categoryObj) {
      categoryObj = { category, docList: [] };
      checklist.documents.push(categoryObj);
    }
    categoryObj.docList.push(doc);

    await checklist.save();
    res.json(checklist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const coCreatorUpdateDocument = async (req, res) => {
  try {
    const { docId, fileUrl, status, deferralReason, comment } = req.body;
    const checklist = await Checklist.findById(req.params.id);
    if (!checklist)
      return res.status(404).json({ error: "Checklist not found" });

    checklist.documents.forEach((category) => {
      category.docList.forEach((doc) => {
        if (doc._id.toString() === docId) {
          if (fileUrl) doc.fileUrl = fileUrl;
          if (status) doc.status = status;
          if (deferralReason) doc.deferralReason = deferralReason;
          if (comment) doc.comment = comment;
        }
      });
    });

    await checklist.save();
    res.json(checklist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const { docId } = req.params;
    const checklist = await Checklist.findById(req.params.id);
    if (!checklist)
      return res.status(404).json({ error: "Checklist not found" });

    checklist.documents.forEach((category) => {
      category.docList = category.docList.filter(
        (doc) => doc._id.toString() !== docId
      );
    });

    await checklist.save();
    res.json(checklist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const uploadDocumentFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "File missing" });

    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${
      req.file.filename
    }`;
    const { docId } = req.params;

    const checklist = await Checklist.findById(req.params.id);
    if (!checklist)
      return res.status(404).json({ error: "Checklist not found" });

    checklist.documents.forEach((category) => {
      category.docList.forEach((doc) => {
        if (doc._id.toString() === docId) doc.fileUrl = fileUrl;
      });
    });

    await checklist.save();
    res.json({ message: "Uploaded", fileUrl, checklist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateDocumentAdmin = async (req, res) => {
  try {
    // Placeholder admin update function
    res.json({ message: "Admin document update not implemented yet" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateCoCreatorChecklistStatus = async (req, res) => {
  try {
    const { checklistId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const updatedChecklist = await Checklist.findByIdAndUpdate(
      checklistId,
      { status },
      { new: true }
    );

    if (!updatedChecklist) {
      return res.status(404).json({ message: "Checklist not found" });
    }

    res.json({
      message: "Checklist status updated successfully",
      checklist: updatedChecklist,
    });
  } catch (err) {
    console.error("Error updating checklist status:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
