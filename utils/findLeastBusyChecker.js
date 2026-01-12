import User from "../models/User.js"; // Adjust path as needed
import Checklist from "../models/Checklist.js"; // Adjust path as needed
import mongoose from "mongoose";

/**
 * Finds the user with the 'cochecker' role who has the fewest non-Completed checklists.
 * The workload is determined by the number of checklists assigned to them 
 * whose status is NOT "Completed".
 *
 * @returns {Promise<mongoose.Types.ObjectId | null>} The Mongoose ObjectId of the least busy checker, or null.
 */
export const findLeastBusyCheckerId = async () => {
  try {
    // 1. Aggregate to find the current workload count for assigned checkers
    const workload = await Checklist.aggregate([
      {
        // Stage 1: Filter non-completed checklists that have been assigned
        $match: {
          status: { $ne: "Completed" },
          assignedToCoChecker: { $ne: null },
        },
      },
      {
        // Stage 2: Group by the assigned checker ID and count the checklists
        $group: {
          _id: "$assignedToCoChecker",
          workloadCount: { $sum: 1 },
        },
      },
      {
        // Stage 3: Sort by count ascending (least busy first)
        $sort: { workloadCount: 1 },
      },
    ]);

    // 2. Get all active Co-Checker IDs
    const allCheckers = await User.find(
      { role: "cochecker", active: true },
      "_id"
    ).lean(); // Use .lean() for faster lookup

    const checkerIds = allCheckers.map((c) => c._id.toString());

    // 3. Convert aggregation results into a map: { 'checkerId': count }
    const workloadMap = workload.reduce((map, item) => {
      // Ensure the _id is a string for consistent lookup
      map[item._id.toString()] = item.workloadCount;
      return map;
    }, {});

    let leastBusyCheckerId = null;
    let minWorkload = Infinity;

    // 4. Loop through ALL active checkers to find the minimum workload, 
    // including those who didn't appear in the aggregation (count = 0).
    for (const idString of checkerIds) {
      const currentWorkload = workloadMap[idString] || 0; // If not in map, workload is 0

      if (currentWorkload < minWorkload) {
        minWorkload = currentWorkload;
        leastBusyCheckerId = idString;
      }
    }

    // 5. Return the result as a Mongoose ObjectId
    return leastBusyCheckerId
      ? new mongoose.Types.ObjectId(leastBusyCheckerId)
      : null;
  } catch (error) {
    console.error("Error finding least busy checker:", error);
    return null;
  }
};