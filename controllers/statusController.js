import Checklist from "../models/Checklist.js";
import { addLog } from "../helpers/checklistHelpers.js";

/**
 * Controller to update document details, status, and specific flags of a checklist.
 * Expects { status: "new_status", documents: [flat docs], assignedToCoChecker: "userId" } in the body.
 * This is used for workflow transitions where document data might be updated (e.g., Submit to Checker).
 * * Route: PATCH /api/checklist/:id/checklist-status
 */
export const updateChecklistStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      assignedToCoChecker,
      submittedToCoChecker,
      documents: flatDocuments,
    } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status field is required." });
    }

    const updateFields = { status };
    let logMessage = `Checklist status changed to: ${status}`;

    // 1. HANDLE DOCUMENT PAYLOAD UPDATE (Flattened from frontend, must be nested for DB)
    if (flatDocuments && flatDocuments.length > 0) {
      // Group the flat documents by category to match the Mongoose schema
      const groupedDocuments = flatDocuments.reduce((acc, doc) => {
        // Find or create the category object
        let categoryObject = acc.find((c) => c.category === doc.category);

        if (!categoryObject) {
          categoryObject = { category: doc.category, docList: [] };
          acc.push(categoryObject);
        }
        // Push the document details into the nested docList
        categoryObject.docList.push({
          _id: doc._id,
          name: doc.name,
          status: doc.status,
          comment: doc.comment,
          action: doc.action,
          fileUrl: doc.fileUrl,
          deferralReason: doc.deferralReason,
          deferralRequested: doc.deferralRequested,
        });

        return acc;
      }, []);

      // Add the restructured documents to the update payload
      updateFields.documents = groupedDocuments;
      logMessage = `Documents updated and ${logMessage}`;
    }

    // 2. HANDLE STATUS/ASSIGNMENT FLAGS
    // Add co-checker assignment if provided
    if (assignedToCoChecker) {
      updateFields.assignedToCoChecker = assignedToCoChecker;
      logMessage += ` and assigned to Co-Checker: ${assignedToCoChecker}`;
    }

    // Add the submission flag if provided
    if (submittedToCoChecker !== undefined) {
      updateFields.submittedToCoChecker = submittedToCoChecker;
      logMessage += ` (Submission Flag: ${submittedToCoChecker})`;
    }

    // 3. EXECUTE UPDATE
    const checklist = await Checklist.findByIdAndUpdate(id, updateFields, {
      new: true,
    })
      .populate("assignedToRM", "name email")
      .populate("assignedToCoChecker", "name email")
      .populate("createdBy", "name email");

    if (!checklist) {
      return res.status(404).json({ error: "Checklist not found" });
    }

    addLog(checklist, logMessage, req.user?.id);
    await checklist.save();
    res.json(checklist);
  } catch (error) {
    console.error("🔥 BACKEND ERROR (updateChecklistStatus):", error);
    res.status(500).json({ error: error.message });
  }
};
