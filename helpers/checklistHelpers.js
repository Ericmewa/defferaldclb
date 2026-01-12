
import Checklist from "../models/Checklist.js"; 

export const generateDclNumber = async () => {
   
    const currentYear = new Date().getFullYear().toString().slice(-2); 
    // We search for checklists created since Jan 1st of the current year,.
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const count = await Checklist.countDocuments({ 
        createdAt: { $gte: startOfYear } 
    });
    const nextNumber = (count + 1).toString().padStart(4, '0');
    // Example: DCL-24-0001
    return `DCL-${currentYear}-${nextNumber}`;
};


// helpers/checklistHelpers.js
export const addLog = (checklist, message, userId) => {
  if (!checklist.logs) checklist.logs = [];
  checklist.logs.push({ message, userId });
};
