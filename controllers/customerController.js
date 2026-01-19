import Deferral from "../models/Deferral.js";
import Checklist from "../models/Checklist.js";

export const searchCustomer = async (req, res) => {
  const { customerNumber, loanType } = req.body;

  // MOCK / CORE BANKING INTEGRATION
  res.json({
    customerNumber,
    customerName: "John Doe",
    businessName: "Doe Enterprises",
    loanType,
  });
};

export const searchByDcl = async (req, res) => {
  try {
    const { dclNumber } = req.query;

    if (!dclNumber) {
      return res.status(400).json({ message: "DCL number is required" });
    }

    // Search for checklists (DCLs) with matching DCL number (case-insensitive)
    const checklists = await Checklist.find({
      dclNo: { $regex: `^${dclNumber}`, $options: "i" },
    })
      .populate("customerId", "name email role")
      .populate("assignedToRM", "name email role")
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 })
      .limit(10);

    // Map checklists to return customer details for auto-population
    const results = checklists.map((checklist) => ({
      _id: checklist._id,
      dclNumber: checklist.dclNo,
      customerNumber: checklist.customerNumber,
      customerName: checklist.customerName,
      businessName: checklist.customerName, // Use customerName as business name if not available
      loanType: checklist.loanType,
      customer: checklist.customerId,
    }));

    res.json(results);
  } catch (error) {
    console.error("Search by DCL error:", error);
    res.status(500).json({ message: "Failed to search by DCL number", error: error.message });
  }
};

