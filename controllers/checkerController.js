import Checklist from "../models/Checklist.js";
import Notification from "../models/Notification.js";

// -------------------------------------------------
// 1. Active DCLs (CoCreator stage)
// status: "co_creator_review"
// -------------------------------------------------
export const getCheckerActiveDCLs = async (req, res) => {
  try {
    const dcls = await Checklist.find({ status: "co_creator_review" })
      .populate("assignedToRM")
      .populate("createdBy")
      .sort({ createdAt: -1 });

    res.json(Array.isArray(dcls) ? dcls : []);
  } catch (error) {
    console.error("🔥 Active DCLs Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// -------------------------------------------------
// 2. My Queue (Checker assigned)
// status: "in_progress"
// -------------------------------------------------
export const getCheckerMyQueue = async (req, res) => {
  try {
    const { checkerId } = req.params;
    if (!checkerId)
      return res.status(400).json({ error: "checkerId is required" });

    const dcls = await Checklist.find({
      assignedToChecker: checkerId,
      status: "in_progress",
    })
      .populate("assignedToRM")
      .populate("createdBy")
      .sort({ updatedAt: -1 });

    res.json(Array.isArray(dcls) ? dcls : []);
  } catch (error) {
    console.error("🔥 My Queue Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// -------------------------------------------------
// 3. Completed DCLs (Approved)
// -------------------------------------------------
export const getCheckerCompletedDCLs = async (req, res) => {
  try {
    const dcls = await Checklist.find({ status: "approved" })
      .populate("assignedToRM")
      .populate("createdBy")
      .populate("assignedToChecker")
      .sort({ updatedAt: -1 });

    res.json(Array.isArray(dcls) ? dcls : []);
  } catch (error) {
    console.error("🔥 Completed DCLs Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// -------------------------------------------------
// 4. Get Single DCL
// -------------------------------------------------
export const getCheckerDclById = async (req, res) => {
  try {
    const dcl = await Checklist.findById(req.params.id)
      .populate("assignedToRM")
      .populate("createdBy")
      .populate("assignedToChecker");

    if (!dcl) return res.status(404).json({ error: "DCL not found" });
    res.json(dcl);
  } catch (error) {
    console.error("🔥 Get DCL Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// -------------------------------------------------
// 5. Update DCL Status (Approve / Reject / Return)
// -------------------------------------------------
export const updateCheckerDclStatus = async (req, res) => {
  try {
    const { status, checkerComment, checkerId } = req.body;

    const dcl = await Checklist.findById(req.params.id);
    if (!dcl) return res.status(404).json({ error: "DCL not found" });

    if (status) dcl.status = status;
    if (checkerComment) dcl.checkerComment = checkerComment;

    if (checkerId) {
      dcl.assignedToChecker = checkerId; // corrected
      if (!status) dcl.status = "in_progress";
    }

    await dcl.save();
    res.json(dcl);
  } catch (error) {
    console.error("🔥 Update DCL Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// -------------------------------------------------
// 6. Auto-Move My Queue → Completed
// Excludes approved DCLs
// -------------------------------------------------
export const getAutoMovedCheckerMyQueue = async (req, res) => {
  try {
    const { checkerId } = req.params;
    if (!checkerId)
      return res.status(400).json({ error: "checkerId is required" });

    const dcls = await Checklist.find({
      assignedToChecker: checkerId,
      status: { $ne: "approved" },
    })
      .populate("assignedToRM")
      .populate("createdBy")
      .sort({ updatedAt: -1 });

    res.json(Array.isArray(dcls) ? dcls : []);
  } catch (error) {
    console.error("🔥 Auto-Move Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// -------------------------------------------------
// 7. Reports for Checker Dashboard
// Returns counts only
// -------------------------------------------------
export const getCheckerReports = async (req, res) => {
  try {
    const { checkerId } = req.params;
    if (!checkerId)
      return res.status(400).json({ error: "checkerId is required" });

    const [myQueueCount, activeDclsCount, completedCount] = await Promise.all([
      Checklist.countDocuments({
        assignedToChecker: checkerId,
        status: "in_progress",
      }),
      Checklist.countDocuments({ status: "co_creator_review" }),
      Checklist.countDocuments({
        assignedToChecker: checkerId,
        status: "approved",
      }),
    ]);

    res.json({
      myQueue: myQueueCount,
      activeDcls: activeDclsCount,
      completed: completedCount,
    });
  } catch (error) {
    console.error("🔥 Reports API Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// -------------------------------------------------
// 8. Approve DCL + Send Notifications
// -------------------------------------------------
export const approveCheckerDclWithNotification = async (req, res) => {
  try {
    const { checkerComment } = req.body;
    const { id } = req.params;

    const dcl = await Checklist.findById(id);
    if (!dcl) return res.status(404).json({ error: "DCL not found" });

    dcl.status = "approved";
    dcl.checkerComment = checkerComment || "";
    await dcl.save();

    await Notification.create({
      userId: dcl.createdBy,
      title: "DCL Approved",
      message: `Your DCL (${dcl._id}) has been approved.`,
    });

    if (dcl.assignedToRM) {
      await Notification.create({
        userId: dcl.assignedToRM,
        title: "DCL Approved",
        message: `A DCL assigned to you (${dcl._id}) has been approved.`,
      });
    }

    res.json({ message: "DCL approved and notifications sent", dcl });
  } catch (error) {
    console.error("🔥 Approve Notification Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// -------------------------------------------------
// 9. Reject DCL + Send Notifications
// -------------------------------------------------
export const rejectCheckerDclWithNotification = async (req, res) => {
  try {
    const { remarks } = req.body;
    const { id } = req.params;

    const dcl = await Checklist.findById(id);
    if (!dcl) return res.status(404).json({ error: "DCL not found" });

    dcl.status = "rejected";
    dcl.remarks = remarks || "";
    await dcl.save();

    await Notification.create({
      userId: dcl.createdBy,
      title: "DCL Rejected",
      message: `Your DCL (${dcl._id}) was rejected. Reason: ${remarks}`,
    });

    if (dcl.assignedToRM) {
      await Notification.create({
        userId: dcl.assignedToRM,
        title: "DCL Rejected",
        message: `A DCL assigned to you (${dcl._id}) was rejected.`,
      });
    }

    res.json({ message: "DCL rejected and notifications sent", dcl });
  } catch (error) {
    console.error("🔥 Reject Notification Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// -------------------------------------------------
// 10. Completed DCLs for Checker (NEW API)
// status: "approved"
// -------------------------------------------------
export const getCompletedDCLsForChecker = async (req, res) => {
  try {
    const { checkerId } = req.params;
    if (!checkerId)
      return res.status(400).json({ error: "checkerId is required" });

    const dcls = await Checklist.find({
      assignedToChecker: checkerId,
      status: "approved",
    })
      .populate("assignedToRM")
      .populate("createdBy")
      .populate("assignedToChecker")
      .sort({ updatedAt: -1 });

    res.json(Array.isArray(dcls) ? dcls : []);
  } catch (error) {
    console.error("🔥 Completed DCLs Error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const updateCheckerStatus = async (req, res) => {
  try {
    // 1. Get the ID from URL parameters and the action from the body

    const { action, id } = req.body;

    console.log(action, id);

    if (!id || !action) {
      return res.status(400).json({
        error: "Checklist ID and action are required",
      });
    }

    // 2. Map the frontend action string to a database status value
    let newStatus;
    if (action === "approved") {
      newStatus = "Approved"; // Match a value in CHECKLIST_STATUS_ENUM
    } else if (action === "co_creator_review") {
      newStatus = "co_creator_review"; // Send back to the creator
    } else {
      return res.status(400).json({
        error: `Invalid action: ${action}`,
      });
    }

    // 3. Retrieve the checklist using the ID
    const checklist = await Checklist.findById(id);

    if (!checklist) {
      return res.status(404).json({
        error: "Checklist not found",
      });
    }

    // 4. Patch the checklist status and update metadata
    checklist.status = newStatus;

    // Update metadata using the fields added in the previous step
    // checklist.checkerReviewedBy = req.user?._id;
    // checklist.checkerReviewedAt = new Date();

    // Log the action
    checklist.logs.push({
      message: `Checklist status changed to ${newStatus} by Co-Checker`,
      userId: req.user?._id,
      timestamp: new Date(),
    });

    await checklist.save();

    res.status(200).json({
      message: `Checklist successfully set to status: ${newStatus}`,
      checklist,
    });
  } catch (error) {
    console.error("Checker final action error:", error);
    res.status(500).json({
      error: "Failed to process checker action",
    });
  }
};
