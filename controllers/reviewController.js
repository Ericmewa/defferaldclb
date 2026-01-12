import Notification from "../models/Notification.js";

await Notification.create({
  user: checklist.relationshipManager,
  message: `Your document "${docId}" was reviewed as ${status}`,
});
