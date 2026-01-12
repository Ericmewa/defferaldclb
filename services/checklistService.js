// services/checklistService.js
import Checklist from "../models/Checklist.js";

export const createChecklistService = async (payload) => {
  const last = await Checklist.findOne({}, {}, { sort: { createdAt: -1 } });
  const nextDclNo = last ? `DCL-${Date.now().toString().slice(-6)}` : `DCL-000001`;
  const doc = new Checklist({ dclNo: nextDclNo, ...payload });
  return await doc.save();
};

export const getAllChecklistsService = async (filter = {}) =>
  Checklist.find(filter).populate("createdBy assignedToRM assignedToCoChecker").lean();

export const getChecklistByIdService = async (id) =>
  Checklist.findById(id).populate("createdBy assignedToRM assignedToCoChecker");

export const updateChecklistService = async (id, update) =>
  Checklist.findByIdAndUpdate(id, update, { new: true });

export const addDocumentToChecklistService = async (checklistId, category, doc) =>
  Checklist.findByIdAndUpdate(
    checklistId,
    { $push: { documents: { category, docList: [doc] } } }, // if category doesn't exist you'll need logic to create it.
    { new: true }
  );

export const pushDocIntoCategoryService = async (checklistId, category, doc) => {
  const checklist = await Checklist.findById(checklistId);
  if (!checklist) throw new Error("Checklist not found");
  const cat = checklist.documents.find((c) => c.category === category);
  if (cat) {
    cat.docList.push(doc);
  } else {
    checklist.documents.push({ category, docList: [doc] });
  }
  await checklist.save();
  return checklist;
};

export const updateDocumentService = async (checklistId, docId, update) => {
  const checklist = await Checklist.findById(checklistId);
  if (!checklist) throw new Error("Checklist not found");
  for (const category of checklist.documents) {
    const doc = category.docList.id(docId);
    if (doc) {
      Object.assign(doc, update);
      await checklist.save();
      return checklist;
    }
  }
  throw new Error("Document not found");
};

export const deleteDocumentService = async (checklistId, docId) => {
  const checklist = await Checklist.findById(checklistId);
  if (!checklist) throw new Error("Checklist not found");
  for (const category of checklist.documents) {
    const doc = category.docList.id(docId);
    if (doc) {
      doc.remove();
      await checklist.save();
      return checklist;
    }
  }
  throw new Error("Document not found");
};

export const uploadDocFileService = async (checklistId, docId, fileUrl) => {
  return await updateDocumentService(checklistId, docId, { fileUrl });
};
