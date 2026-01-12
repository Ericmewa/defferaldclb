import UserLog from "../models/UserLog.js";

export const getLogs = async (req, res) => {
  // Optionally paginate, filter by user, etc.
  const logs = await UserLog.find().sort({ timestamp: -1 }).limit(50);
  res.json(logs);
};
