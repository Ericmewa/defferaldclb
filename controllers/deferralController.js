import Deferral from "../models/Deferral.js";
import User from "../models/User.js";
import PDFDocument from "pdfkit";
import { sendEmail } from "../services/emailService.js";
import { deferralSubmissionTemplate, deferralApprovalTemplate, deferralFinalNotification, deferralRejectionTemplate, deferralReminderTemplate } from "../services/emailTemplates.js";
import Notification from "../models/Notification.js";

// Helper function to ensure approval status fields are set on a deferral document
const ensureApprovalFields = (deferral) => {
  if (!deferral) return null;
  
  const doc = deferral.toObject ? deferral.toObject() : deferral;
  
  // Ensure all approval status fields exist with default values
  if (typeof doc.allApproversApproved === 'undefined' || doc.allApproversApproved === null) {
    // Check if all approvers have actually approved
    const allApproved = doc.approvers && Array.isArray(doc.approvers) && doc.approvers.length > 0 && doc.approvers.every(a => a.approved === true);
    doc.allApproversApproved = allApproved ? true : false;
  }
  
  if (typeof doc.creatorApprovalStatus === 'undefined' || doc.creatorApprovalStatus === null) {
    doc.creatorApprovalStatus = 'pending';
  }
  
  if (typeof doc.checkerApprovalStatus === 'undefined' || doc.checkerApprovalStatus === null) {
    doc.checkerApprovalStatus = 'pending';
  }
  
  return doc;
};

/* CREATE DEFERRAL */
export const createDeferral = async (req, res) => {
  // Basic validation: enforce DCL number presence when required
  if (!req.body.dclNumber) {
    return res.status(400).json({ message: "DCL number is required" });
  }

  // Generate a server-side sequential deferral number in format DEF-YY-XXXX
  const yy = new Date().getFullYear().toString().slice(-2);
  const prefix = `DEF-${yy}-`;
  let seq = 1;
  const last = await Deferral.find({ deferralNumber: { $regex: `^${prefix}` } })
    .sort({ deferralNumber: -1 })
    .limit(1);
  if (last && last.length) {
    const m = last[0].deferralNumber.match(new RegExp(`^DEF-${yy}-(\\d{4})$`));
    if (m && m[1]) seq = parseInt(m[1], 10) + 1;
  }
  const deferralNumber = `${prefix}${String(seq).padStart(4, '0')}`;

  const payload = {
    ...req.body,
    deferralNumber, // authoritative server-generated number
    requestor: req.user._id,
  };

  // Normalize any documents included at creation time so uploaded metadata is consistent
  if (payload.documents && Array.isArray(payload.documents)) {
    payload.documents = payload.documents.map((doc) => ({
      name: doc.name,
      url: doc.url || '',
      type: doc.type || (doc.name ? doc.name.split('.').pop().toLowerCase() : undefined),
      size: doc.size || null,
      uploadDate: doc.uploadDate ? new Date(doc.uploadDate) : new Date(),
      isDCL: !!doc.isDCL,
      isAdditional: !!doc.isAdditional,
      uploadedBy: req.user._id,
    }));
  }

  // Normalize selected documents (structure may come as strings or objects with items/selected)
  if (payload.selectedDocuments && Array.isArray(payload.selectedDocuments)) {
    payload.selectedDocuments = payload.selectedDocuments.map((d) => {
      if (typeof d === 'string') return { name: d, type: '', items: [] };
      return {
        name: d.name || d.label || '',
        type: d.type || '',
        items: Array.isArray(d.items) ? d.items : Array.isArray(d.selected) ? d.selected : (d.items ? [d.items] : (d.selected ? [d.selected] : [])),
      };
    });

    // Normalize string values and deduplicate by name (case-insensitive) to avoid duplicate entries showing twice in UI
    payload.selectedDocuments = payload.selectedDocuments.map((sd) => ({
      ...sd,
      name: (sd.name || '').toString().trim(),
      items: Array.isArray(sd.items) ? sd.items.map((it) => (it || '').toString().trim()) : [],
    }));

    const seen = new Set();
    payload.selectedDocuments = payload.selectedDocuments.filter((sd) => {
      const key = (sd.name || '').toLowerCase();
      if (!key) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      // also dedupe items within the same selectedDocument
      if (Array.isArray(sd.items) && sd.items.length) {
        sd.items = Array.from(new Set(sd.items.map((it) => (it || '').toString().trim())));
      }
      return true;
    });
  } else {
    // ensure field exists as an empty array when not provided
    payload.selectedDocuments = payload.selectedDocuments || [];
  }
  // If a customerId is provided, populate deferral customer fields from the User record
  if (req.body.customerId) {
    const customer = await User.findById(req.body.customerId);
    if (customer) {
      payload.customer = customer._id;
      payload.customerNumber = customer.customerNumber || payload.customerNumber;
      payload.customerName = customer.name || payload.customerName;
      payload.businessName = customer.businessName || payload.businessName;
    }
  }

  // Ensure approvers are present - if not provided, accept empty and let client compute
  if (!payload.approvers) payload.approvers = [];

  // default status is set by schema (pending_approval)

  const deferral = await Deferral.create(payload);
  // Optionally populate references for immediate client use
  await deferral.populate("customer requestor approvers.user");

  // Notify the first approver (non-blocking)
  (async () => {
    try {
      const first = (deferral.approvers && deferral.approvers[0]) || null;
      const candidate = first && (first.user || first);
      const email = (candidate && candidate.email) || first && first.email || (typeof candidate === 'string' && candidate.includes('@') ? candidate : null);
      if (email) {
        const target = `/approver?deferralId=${deferral._id}`;
        const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?next=${encodeURIComponent(target)}`;
        const html = deferralSubmissionTemplate(deferral, candidate, link);
        await sendEmail({ to: email, subject: `Deferral ${deferral.deferralNumber} awaiting your approval`, html });
      }
    } catch (err) {
      console.error('createDeferral: failed to send notification', err?.message || err);
    }
  })();

  res.status(201).json(deferral);
};

/* GET PENDING */
export const getPendingDeferrals = async (_, res) => {
  // Return both freshly pending items and those already in-review
  const data = await Deferral.find({ status: { $in: ["pending_approval", "in_review"] } })
    .sort("-createdAt")
    .populate("customer", "name customerNumber")
    .populate("requestor", "name email")
    .populate("comments.author", "name email role")
    .populate("creator", "name email role")
    .populate("checker", "name email role");
  
  // Ensure approval fields are set on all deferrals
  const enrichedData = data.map(d => ensureApprovalFields(d));
  res.json(enrichedData);
};

/* GET APPROVER QUEUE - deferrals which are currently awaiting action by the logged-in approver */
export const getApproverQueue = async (req, res) => {
  const userId = req.user._id;

  const data = await Deferral.find({
    $expr: {
      $and: [
        { $in: ["$status", ["pending_approval", "in_review"]] },
        { $eq: [{ $arrayElemAt: ["$approvers.user", "$currentApproverIndex"] }, userId] },
      ],
    },
  })
    .sort("-createdAt")
    .populate("customer", "name customerNumber")
    .populate("requestor", "name email")
    .populate("approvers.user", "name email position")
    .populate("history.user", "name email role")
    .populate("creator", "name email role")
    .populate("checker", "name email role");

  // Ensure approval fields are set
  const enrichedData = data.map(d => ensureApprovalFields(d));
  res.json(enrichedData);
};



/* GET ACTIONED (deferrals the current approver has actioned: approved/rejected) */
export const getActionedDeferrals = async (req, res) => {
  const userId = req.user._id;
  const data = await Deferral.find({
    $or: [
      { approvers: { $elemMatch: { user: userId, approved: true } } },
      { history: { $elemMatch: { user: userId, action: { $in: ['approved','rejected'] } } } }
    ]
  })
    .sort('-createdAt')
    .populate('customer', 'name customerNumber')
    .populate('requestor', 'name email')
    .populate('approvers.user', 'name email position')
    .populate('history.user', 'name email role')
    .populate('creator', 'name email role')
    .populate('checker', 'name email role');

  // Ensure approval fields are set
  const enrichedData = data.map(d => ensureApprovalFields(d));
  res.json(enrichedData);
};


/* GET SINGLE */
export const getDeferral = async (req, res) => {
  const deferral = await Deferral.findById(req.params.id)
    .populate("customer", "name customerNumber email customerId")
    .populate("requestor", "name email role")
    .populate("approvers.user", "name email position role")
    .populate("history.user", "name email role")
    .populate("comments.author", "name email role")
    .populate("creator", "name email role")
    .populate("checker", "name email role");
  if (!deferral) return res.status(404).json({ message: "Not found" });
  
  // Ensure approval fields are set
  const enrichedDeferral = ensureApprovalFields(deferral);
  res.json(enrichedDeferral);
};

// DEBUG: Fetch deferral by deferral number for troubleshooting (temporary)
export const debugGetByNumber = async (req, res) => {
  const deferral = await Deferral.findOne({ deferralNumber: req.params.number })
    .populate("customer", "name customerNumber email customerId")
    .populate("requestor", "name email role")
    .populate("approvers.user", "name email position role")
    .populate("history.user", "name email role")
    .populate("comments.author", "name email role");
  if (!deferral) return res.status(404).json({ message: "Not found" });
  res.json(deferral);
};

// DEBUG: Fetch only the documents[] for a deferral number (temporary - public, dev only)
export const debugGetDocumentsByNumber = async (req, res) => {
  const deferral = await Deferral.findOne({ deferralNumber: req.params.number })
    .select('deferralNumber documents')
    .populate('documents.uploadedBy', 'name email');
  if (!deferral) return res.status(404).json({ message: 'Not found' });
  res.json({ deferralNumber: deferral.deferralNumber, documents: deferral.documents });
};

// DEBUG: Search for deferrals that contain a document with the given name (dev-only)
export const debugSearchByDocumentName = async (req, res) => {
  const name = req.query.name;
  if (!name) return res.status(400).json({ message: 'Query param `name` is required' });

  // Case-insensitive search for matching document names
  const regex = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), 'i');
  const results = await Deferral.find({ 'documents.name': { $regex: regex } })
    .select('deferralNumber documents')
    .lean();

  // Filter documents in each deferral to only return matching ones
  const payload = results.map(r => ({
    deferralNumber: r.deferralNumber,
    documents: (r.documents || []).filter(d => regex.test(d.name))
  }));

  res.json(payload);
};

/* UPDATE FACILITIES */
export const updateFacilities = async (req, res) => {
  const deferral = await Deferral.findByIdAndUpdate(
    req.params.id,
    { facilities: req.body.facilities },
    { new: true }
  );
  res.json(deferral);
};

/* ADD DOCUMENT (JSON metadata) */
export const addDocument = async (req, res) => {
  const deferral = await Deferral.findById(req.params.id);

  const doc = {
    name: req.body.name,
    url: req.body.url || '',
    type: req.body.type || (req.body.name ? req.body.name.split('.').pop().toLowerCase() : undefined),
    size: req.body.size || null,
    uploadDate: req.body.uploadDate ? new Date(req.body.uploadDate) : new Date(),
    isDCL: !!req.body.isDCL,
    isAdditional: !!req.body.isAdditional,
    uploadedBy: req.user._id,
  };

  deferral.documents.push(doc);
  await deferral.save();

  // Debug log: show document added (temporary)
  console.log('DEBUG: addDocument for deferral', req.params.id, '->', JSON.stringify(doc));

  await deferral.populate('documents');
  res.json(deferral);
};

/* UPLOAD DOCUMENT (multipart/form-data) */
export const uploadDocument = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const deferral = await Deferral.findById(req.params.id);
  if (!deferral) return res.status(404).json({ message: 'Deferral not found' });

  // Build URL pointing to the served uploads folder
  const fileUrl = `/uploads/${req.file.filename}`;

  const doc = {
    name: req.file.originalname,
    url: fileUrl,
    type: req.file.mimetype ? req.file.mimetype.split('/').pop() : undefined,
    size: req.file.size || null,
    uploadDate: new Date(),
    isDCL: req.body.isDCL === 'true' || req.body.isDCL === true,
    isAdditional: req.body.isAdditional === 'true' || req.body.isAdditional === true,
    uploadedBy: req.user._id,
  };

  deferral.documents.push(doc);
  await deferral.save();

  console.log('DEBUG: uploadDocument saved', req.params.id, doc.name, '->', fileUrl);

  await deferral.populate('documents');
  res.json(deferral);
};

/* DELETE DOCUMENT */
export const deleteDocument = async (req, res) => {
  const deferral = await Deferral.findById(req.params.id);
  deferral.documents = deferral.documents.filter(
    (d) => d._id.toString() !== req.params.docId
  );
  await deferral.save();
  res.json(deferral);
};


/* SET APPROVERS */
export const setApprovers = async (req, res) => {
  const deferral = await Deferral.findByIdAndUpdate(
    req.params.id,
    {
      approvers: req.body.approvers.map((name) => ({ name })),
      currentApproverIndex: 0,
    },
    { new: true }
  );
  res.json(deferral);
};

/* REMOVE APPROVER */
export const removeApprover = async (req, res) => {
  const deferral = await Deferral.findById(req.params.id);
  deferral.approvers.splice(req.params.index, 1);
  await deferral.save();
  res.json(deferral);
};

/* APPROVE STEP */
export const approveDeferral = async (req, res) => {
  // Debug: log incoming approval attempt
  console.debug('DEBUG approveDeferral called', { method: req.method, url: req.originalUrl, paramsId: req.params.id, userId: req.user && req.user._id, bodyKeys: Object.keys(req.body || {}) });

  const deferral = await Deferral.findById(req.params.id).populate('approvers.user', 'name email');
  if (!deferral) {
    console.warn('WARN approveDeferral: deferral not found', { id: req.params.id });
    return res.status(404).json({ message: 'Not found' });
  }

  const i = deferral.currentApproverIndex;
  const currentApproverId = deferral.approvers?.[i]?.user?._id?.toString() || deferral.approvers?.[i]?.user?.toString();
  if (!currentApproverId || currentApproverId !== req.user._id.toString()) {
    console.warn('WARN approveDeferral: unauthorized approver action', { id: req.params.id, currentApproverId, attemptedBy: req.user._id });
    return res.status(403).json({ message: 'Only the current approver can take this action' });
  }

  // Debug log: current approver and approver index
  console.debug('approveDeferral called', { id: deferral._id.toString(), currentApproverIndex: i, approversLen: deferral.approvers.length, attemptedBy: req.user._id });

  deferral.approvers[i].approved = true;
  deferral.approvers[i].approvedAt = new Date();
  deferral.history = deferral.history || [];

  // Accept optional approval comment from the approver and persist it in history
  const approvalComment = (req.body && (req.body.comment || req.body.comments || req.body.notes)) ? (req.body.comment || req.body.comments || req.body.notes).toString().trim() : '';

  // Push an approval history entry. Store the comment in `comment` so UIs that check `h.comment` will display it.
  deferral.history.push({
    action: 'approved',
    user: req.user._id,
    userName: req.user.name,
    notes: `Approved by ${req.user.name}`,
    comment: approvalComment || undefined,
    date: new Date()
  });

  if (i + 1 < deferral.approvers.length) {
    deferral.currentApproverIndex++;
    deferral.status = "in_review";
    deferral.history.push({ action: 'moved', user: req.user._id, userName: req.user.name, notes: `Moved to next approver`, date: new Date() });
    console.info('Deferral moved to next approver', { id: deferral._id.toString(), newCurrentIndex: deferral.currentApproverIndex });
  } else {
    // All approvers have approved
    deferral.allApproversApproved = true;
    deferral.status = "in_review"; // Keep as in_review until creator and checker approve
    deferral.approvedBy = req.user.name;
    deferral.approvedById = req.user._id;
    deferral.approvedDate = new Date();
    deferral.history.push({ action: 'completed', user: req.user._id, userName: req.user.name, notes: `Final approver approved - awaiting creator and checker approval`, date: new Date() });
    // Debug log for final approval (includes approver id)
    console.info('All approvers approved', { id: deferral._id.toString(), deferralNumber: deferral.deferralNumber, approvedBy: deferral.approvedBy, approvedById: deferral.approvedById, approvedDate: deferral.approvedDate });
  }

  // If an approval comment was provided, also persist it as a regular comment so it appears in comment trails
  if (approvalComment) {
    deferral.comments = deferral.comments || [];
    deferral.comments.push({ author: req.user._id, text: approvalComment, createdAt: new Date() });
  }

  await deferral.save();
  await deferral.populate("approvers.user", "name email position");
  await deferral.populate("history.user", "name email role");
  // Populate comment authors so frontend can display the approver's comment with name/time
  await deferral.populate("comments.author", "name email role");

  // Send notification to the next approver or final CO (non-blocking)
  (async () => {
    try {
      if (deferral.status === 'in_review') {
        const next = deferral.approvers && deferral.approvers[deferral.currentApproverIndex];
        const candidate = next && (next.user || next);
        const email = (candidate && candidate.email) || next && next.email || (typeof candidate === 'string' && candidate.includes('@') ? candidate : null);
        if (email) {
          const target = `/approver?deferralId=${deferral._id}`;
          const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?next=${encodeURIComponent(target)}`;
          const html = deferralApprovalTemplate(deferral, candidate, link);
          await sendEmail({ to: email, subject: `Deferral ${deferral.deferralNumber} moved to you for approval`, html });
        }
      } else if (deferral.status === 'approved') {
        // Prefer explicit CO email on the deferral if provided, else env var, else requestor
        const coEmail = deferral.coEmail || (deferral.co && deferral.co.email) || process.env.CO_EMAIL || (deferral.requestor && deferral.requestor.email);
        const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/deferrals/${deferral._id}`;
        if (coEmail) {
          const html = deferralFinalNotification(deferral, coEmail, link);
          await sendEmail({ to: coEmail, subject: `Deferral ${deferral.deferralNumber} approved`, html });
        }
      }
    } catch (err) {
      console.error('approveDeferral: failed to send notification', err?.message || err);
    }
  })();

  console.debug('DEBUG approveDeferral: success', { id: req.params.id, newStatus: deferral.status, currentApproverIndex: deferral.currentApproverIndex });
  res.json(deferral);
};

/* APPROVE BY CREATOR - Three-stage approval */
export const approveByCreator = async (req, res) => {
  try {
    const deferral = await Deferral.findById(req.params.id)
      .populate('approvers.user', 'name email role')
      .populate('creator', 'name email role')
      .populate('checker', 'name email role');
    
    if (!deferral) {
      return res.status(404).json({ message: 'Deferral not found' });
    }

    // Verify all approvers have approved before creator can approve
    if (!deferral.allApproversApproved) {
      return res.status(400).json({ message: 'All approvers must approve before creator approval' });
    }

    // Verify user is the creator or set them as creator if not already set
    if (deferral.creator && deferral.creator._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the creator can approve' });
    }

    // If no creator is set, set the current user as the creator
    if (!deferral.creator) {
      deferral.creator = req.user._id;
    }

    // Update creator approval status
    deferral.creatorApprovalStatus = 'approved';
    deferral.creatorApprovalDate = new Date();
    deferral.creatorApprovedBy = req.user._id;

    // Add to history
    const approvalComment = req.body?.comment || '';
    deferral.history = deferral.history || [];
    deferral.history.push({
      action: 'approved',
      user: req.user._id,
      userName: req.user.name,
      notes: `Approved by Creator: ${req.user.name}${approvalComment ? ' - ' + approvalComment : ''}`,
      comment: approvalComment || undefined,
      date: new Date()
    });

    // Add to comments if comment provided
    if (approvalComment) {
      deferral.comments = deferral.comments || [];
      deferral.comments.push({
        author: req.user._id,
        text: approvalComment,
        createdAt: new Date()
      });
    }

    await deferral.save();
    await deferral.populate('approvers.user', 'name email role');
    await deferral.populate('history.user', 'name email role');
    await deferral.populate('comments.author', 'name email role');
    await deferral.populate('creator', 'name email role');
    await deferral.populate('checker', 'name email role');

    res.json({
      success: true,
      deferral,
      message: 'Approved by creator successfully'
    });
  } catch (error) {
    console.error('approveByCreator error:', error);
    res.status(500).json({ message: 'Failed to approve by creator', error: error.message });
  }
};

/* APPROVE BY CHECKER - Three-stage approval */
export const approveByChecker = async (req, res) => {
  try {
    const deferral = await Deferral.findById(req.params.id)
      .populate('approvers.user', 'name email role')
      .populate('creator', 'name email role')
      .populate('checker', 'name email role');
    
    if (!deferral) {
      return res.status(404).json({ message: 'Deferral not found' });
    }

    // Verify all approvers have approved
    if (!deferral.allApproversApproved) {
      return res.status(400).json({ message: 'All approvers must approve before checker approval' });
    }

    // Verify creator has approved
    if (deferral.creatorApprovalStatus !== 'approved') {
      return res.status(400).json({ message: 'Creator must approve before checker approval' });
    }

    // Verify user is the checker (or auto-assign if not set)
    if (deferral.checker && deferral.checker._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the checker can approve' });
    }
    if (!deferral.checker) {
      deferral.checker = req.user._id;
    }

    // Update checker approval status
    deferral.checkerApprovalStatus = 'approved';
    deferral.checkerApprovalDate = new Date();
    deferral.checkerApprovedBy = req.user._id;
    
    // Mark as fully approved
    deferral.status = 'approved';

    // Add to history
    const approvalComment = req.body?.comment || '';
    deferral.history = deferral.history || [];
    deferral.history.push({
      action: 'approved',
      user: req.user._id,
      userName: req.user.name,
      notes: `Approved by Checker: ${req.user.name}${approvalComment ? ' - ' + approvalComment : ''} - Deferral fully approved`,
      comment: approvalComment || undefined,
      date: new Date()
    });

    // Add to comments if comment provided
    if (approvalComment) {
      deferral.comments = deferral.comments || [];
      deferral.comments.push({
        author: req.user._id,
        text: approvalComment,
        createdAt: new Date()
      });
    }

    await deferral.save();
    await deferral.populate('approvers.user', 'name email role');
    await deferral.populate('history.user', 'name email role');
    await deferral.populate('comments.author', 'name email role');
    await deferral.populate('creator', 'name email role');
    await deferral.populate('checker', 'name email role');

    res.json({
      success: true,
      deferral,
      message: 'Deferral fully approved by checker'
    });
  } catch (error) {
    console.error('approveByChecker error:', error);
    res.status(500).json({ message: 'Failed to approve by checker', error: error.message });
  }
};

/* REJECT */
export const rejectDeferral = async (req, res) => {
  const deferral = await Deferral.findById(req.params.id);
  if (!deferral) return res.status(404).json({ message: 'Not found' });

  const i = deferral.currentApproverIndex;
  const currentApproverId = deferral.approvers?.[i]?.user?.toString();
  if (!currentApproverId || currentApproverId !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Only the current approver can take this action' });
  }

  deferral.status = 'rejected';
  deferral.rejectionReason = req.body.reason || 'Rejected by approver';
  deferral.rejectedBy = req.user.name;
  deferral.rejectedById = req.user._id;
  deferral.rejectedDate = new Date();
  deferral.history = deferral.history || [];
  deferral.history.push({ action: 'rejected', user: req.user._id, userName: req.user.name, notes: req.body.reason || '', date: new Date() });

  await deferral.save();
  await deferral.populate("history.user", "name email role");
  await deferral.populate("comments.author", "name email role");

  // Notify requestor and create an in-app notification (non-blocking)
  (async () => {
    try {
      const requestorEmail = deferral.requestor && (deferral.requestor.email || (typeof deferral.requestor === 'string' ? deferral.requestor : null));
      const requestorId = deferral.requestor && (deferral.requestor._id || deferral.requestor);
      if (requestorEmail) {
        const detailLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/deferrals/${deferral._id}`;
        const rejectedListLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?next=${encodeURIComponent('/rm/deferrals/pending?active=rejected')}`;
        const html = deferralRejectionTemplate(deferral, deferral.rejectionReason, detailLink, rejectedListLink);
        await sendEmail({ to: requestorEmail, subject: `Deferral ${deferral.deferralNumber} rejected`, html });
      }
      if (requestorId) {
        await Notification.create({ user: requestorId, message: `Your deferral ${deferral.deferralNumber} was rejected: ${deferral.rejectionReason}` });
      }
    } catch (err) {
      console.error('rejectDeferral: failed to send notification', err?.message || err);
    }
  })();

  res.json(deferral);
};

/* RETURN FOR REWORK */
export const returnForRework = async (req, res) => {
  const deferral = await Deferral.findById(req.params.id).populate("requestor", "email name");
  if (!deferral) return res.status(404).json({ message: 'Not found' });

  // Only current approver can return for rework
  const i = deferral.currentApproverIndex;
  const currentApproverId = deferral.approvers?.[i]?.user?.toString();
  if (!currentApproverId || currentApproverId !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Only the current approver can take this action' });
  }

  deferral.status = 'returned_for_rework';
  deferral.reworkRequestedBy = req.user.name;
  deferral.reworkRequestedById = req.user._id;
  deferral.reworkRequestedDate = new Date();
  deferral.reworkComments = req.body.reworkComment || 'Please review and resubmit';
  deferral.approverComments = req.body.approverComments || req.body.reworkComment || '';
  deferral.history = deferral.history || [];
  deferral.history.push({ 
    action: 'returned_for_rework', 
    user: req.user._id, 
    userName: req.user.name, 
    notes: req.body.reworkComment || 'Returned for rework', 
    date: new Date() 
  });

  await deferral.save();
  await deferral.populate("history.user", "name email role");
  await deferral.populate("comments.author", "name email role");
  (async () => {
    try {
      const requestorEmail = deferral.requestor?.email || (typeof deferral.requestor === 'string' ? deferral.requestor : null);
      const requestorId = deferral.requestor?._id || deferral.requestor;
      
      if (requestorEmail) {
        const detailLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/deferrals/${deferral._id}`;
        const reworkListLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?next=${encodeURIComponent('/rm/deferrals/pending?active=rejected')}`;
        
        // Simple email notification for return for rework
        const html = `
          <h2>Deferral Returned for Rework</h2>
          <p>Your deferral request <strong>${deferral.deferralNumber}</strong> has been returned for rework.</p>
          <p><strong>Reason:</strong> ${req.body.reworkComment || 'Please review and make necessary corrections.'}</p>
          <p><a href="${detailLink}">View Deferral Details</a></p>
          <p><a href="${reworkListLink}">View All Rework Items</a></p>
        `;
        
        await sendEmail({ to: requestorEmail, subject: `Deferral ${deferral.deferralNumber} returned for rework`, html });
      }
      
      if (requestorId) {
        await Notification.create({ 
          user: requestorId, 
          message: `Your deferral ${deferral.deferralNumber} has been returned for rework: ${req.body.reworkComment || 'Please review and resubmit'}` 
        });
      }
    } catch (err) {
      console.error('returnForRework: failed to send notification', err?.message || err);
    }
  })();

  res.json(deferral);
};

/* COMMENTS */
export const addComment = async (req, res) => {
  const deferral = await Deferral.findById(req.params.id);
  if (!deferral) return res.status(404).json({ message: "Not found" });

  const comment = {
    author: req.user._id,
    text: req.body.text,
    createdAt: new Date(),
  };

  deferral.comments.push(comment);
  await deferral.save();

  await deferral.populate("comments.author", "name email role");
  res.status(201).json(deferral.comments[deferral.comments.length - 1]);
};

export const getComments = async (req, res) => {
  const deferral = await Deferral.findById(req.params.id).populate(
    "comments.author",
    "name email role"
  );
  if (!deferral) return res.status(404).json({ message: "Not found" });
  res.json(deferral.comments);
};

/* MY DEFERRALS */
export const getMyDeferrals = async (req, res) => {
  const data = await Deferral.find({ requestor: req.user._id })
    .sort("-createdAt")
    .populate("customer", "name customerNumber")
    .populate("approvers.user", "name email")
    .populate("comments.author", "name email role")
    .populate("creator", "name email role")
    .populate("checker", "name email role");
  
  // Ensure approval fields are set on all deferrals
  const enrichedData = data.map(d => ensureApprovalFields(d));
  res.json(enrichedData);
};

/* GET APPROVED DEFERRALS (for CO dashboard) */
export const getApprovedDeferrals = async (req, res) => {
  try {
    const data = await Deferral.find({ status: 'approved' })
      .sort('-createdAt')
      .populate('customer', 'name customerNumber')
      .populate('requestor', 'name email')
      .populate('approvers.user', 'name email position')
      .populate('history.user', 'name email role')
      .populate('comments.author', 'name email role')
      .populate('creator', 'name email role')
      .populate('checker', 'name email role');

    // Ensure approval fields are set on all deferrals
    const enrichedData = data.map(d => ensureApprovalFields(d));
    
    console.info('getApprovedDeferrals returned', { count: enrichedData.length, ids: enrichedData.map(d => d.deferralNumber) });
    res.json(enrichedData);
  } catch (err) {
    console.error('ERROR getApprovedDeferrals failed', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Failed to fetch approved deferrals', error: err?.message || String(err) });
  }
};

/* SEND REMINDER to current approver (triggered by RM) */
export const sendReminder = async (req, res) => {
  try {
    const deferral = await Deferral.findById(req.params.id).populate('requestor', 'name email');
    if (!deferral) return res.status(404).json({ message: 'Not found' });

    // determine current approver (currentApprover or first in approverFlow)
    const current = deferral.currentApprover || (deferral.approverFlow && deferral.approverFlow[0]) || null;
    let email = null;
    let name = null;
    if (current) {
      email = current.email || (current.user && current.user.email) || (typeof current === 'string' && current.includes('@') ? current : null);
      name = current.name || (current.user && current.user.name) || (typeof current === 'string' ? current.split('@')[0] : null);
    }

    if (!email) return res.status(400).json({ message: 'No email available for current approver' });

    const target = `/approver?deferralId=${deferral._id}`;
    const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?next=${encodeURIComponent(target)}`;
    const html = deferralReminderTemplate(deferral, name || email.split('@')[0], link);

    await sendEmail({ to: email, subject: `Reminder: Deferral ${deferral.deferralNumber} awaiting your approval`, html });

    deferral.history = deferral.history || [];
    deferral.history.push({ user: req.user._id, action: 'reminder', date: new Date(), comment: `Reminder sent to ${email}` });
    await deferral.save();

    res.json({ success: true, email });
  } catch (err) {
    console.error('sendReminder error', err && err.stack ? err.stack : err);
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
};
/* GET NEXT DEFERAL NUMBER (preview) */
export const getNextDeferralNumber = async (req, res) => {
  const yy = new Date().getFullYear().toString().slice(-2);
  const prefix = `DEF-${yy}-`;
  let seq = 1;
  const last = await Deferral.find({ deferralNumber: { $regex: `^${prefix}` } })
    .sort({ deferralNumber: -1 })
    .limit(1);
  if (last && last.length) {
    const m = last[0].deferralNumber.match(new RegExp(`^DEF-${yy}-(\d{4})$`));
    if (m && m[1]) seq = parseInt(m[1], 10) + 1;
  }
  const deferralNumber = `${prefix}${String(seq).padStart(4, '0')}`;
  res.json({ deferralNumber });
};

/* DEV: Seed sample deferrals (development only) */
export const seedDeferrals = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Seeding not allowed in production' });
  }

  // Optional: require admin role via middleware; assume protect + role check used in route
  const existing = await Deferral.find().limit(1);
  if (existing && existing.length) {
    return res.json({ message: 'Deferrals already exist in DB', skipped: true });
  }

  // Minimal sample deferrals
  const samples = [
    {
      deferralNumber: 'DEF-26-0001',
      dclNumber: 'DCL-001',
      customerName: 'Titus Mwiti',
      customerNumber: 'CUST-1001',
      loanType: 'asset finance',
      deferralTitle: 'Titus Mwiti',
      deferralType: 'New',
      status: 'pending_approval',
      daysSought: 20,
      slaExpiry: new Date(2020, 0, 1).toISOString(),
      facilities: [
        { facilityNumber: 'FAC-001', facilityType: 'Term Loan', amount: 1500000 }
      ],
      selectedDocuments: [{ name: 'Bank Statement', type: 'Bank Statement' }],
      attachments: [],
      history: []
    },
    {
      deferralNumber: 'DEF-26-0002',
      dclNumber: 'DCL-002',
      customerName: 'Jane Njeri',
      customerNumber: 'CUST-1002',
      loanType: 'mortgage',
      deferralTitle: 'Loan reschedule',
      deferralType: 'Extension',
      status: 'approved',
      daysSought: 15,
      slaExpiry: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      facilities: [
        { facilityNumber: 'FAC-002', facilityType: 'Mortgage Loan', amount: 5000000 }
      ],
      selectedDocuments: [{ name: 'Title Deed', type: 'Title Deed' }],
      attachments: [],
      history: []
    }
  ];

  const created = [];
  for (const s of samples) {
    try {
      const d = await Deferral.create(s);
      created.push(d);
    } catch (e) {
      console.error('Failed to create sample deferral', e);
    }
  }

  res.json({ created: created.length, samples: created.map(c => c.deferralNumber) });
};
/* GENERATE PDF (stub) */

// controllers/deferralController.js



export const generatePDF = async (req, res) => {
  const deferral = await Deferral.findById(req.params.id);

  if (!deferral) {
    return res.status(404).json({ message: "Deferral not found" });
  }

  const doc = new PDFDocument({ margin: 40 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename=${deferral.deferralNumber}.pdf`
  );

  doc.pipe(res);

  /* HEADER */
  doc.fontSize(18).text("DEFERRAL REQUEST", { align: "center" });
  doc.moveDown();

  /* BASIC INFO */
  doc.fontSize(11);
  doc.text(`Deferral No: ${deferral.deferralNumber}`);
  doc.text(`Customer No: ${deferral.customerNumber}`);
  doc.text(`Customer Name: ${deferral.customerName}`);
  doc.text(`Business Name: ${deferral.businessName}`);
  doc.text(`Loan Type: ${deferral.loanType}`);
  doc.text(`Status: ${deferral.status}`);
  doc.moveDown();

  /* FACILITIES */
  doc.fontSize(13).text("Facilities", { underline: true });
  doc.moveDown(0.5);

  deferral.facilities.forEach((f, i) => {
    doc.text(
      `${i + 1}. ${f.type} | Sanctioned: ${f.sanctioned} | Balance: ${f.balance} | Headroom: ${f.headroom}`
    );
  });

  doc.moveDown();

  /* DOCUMENTS */
  doc.fontSize(13).text("Attached Documents", { underline: true });
  doc.moveDown(0.5);

  deferral.documents.forEach((d, i) => {
    doc.text(`${i + 1}. ${d.name}`);
  });

  doc.moveDown();

  /* APPROVERS */
  doc.fontSize(13).text("Approvals", { underline: true });
  doc.moveDown(0.5);

  deferral.approvers.forEach((a, i) => {
    doc.text(
      `${i + 1}. ${a.name} - ${
        a.approved ? `Approved (${a.approvedAt?.toLocaleString()})` : "Pending"
      }`
    );
  });

  doc.end();
};

/* POST COMMENT */
export const postComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, author } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Deferral ID is required" });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    // Find the deferral
    const deferral = await Deferral.findById(id);
    if (!deferral) {
      return res.status(404).json({ message: "Deferral not found" });
    }

    // Initialize comments array if it doesn't exist
    if (!Array.isArray(deferral.comments)) {
      deferral.comments = [];
    }

    // Create the comment object
    const newComment = {
      text: text.trim(),
      author: {
        name: author?.name || req.user?.name || 'User',
        role: author?.role || req.user?.role || 'user',
        id: req.user?._id
      },
      createdAt: new Date()
    };

    // Add to comments array
    deferral.comments.push(newComment);

    // Save the deferral
    await deferral.save();

    res.json({
      success: true,
      message: 'Comment posted successfully',
      deferral: deferral
    });
  } catch (error) {
    console.error('Error posting comment:', error);
    res.status(500).json({ message: error.message || 'Failed to post comment' });
  }
};

// DEBUG: Create an approved deferral (development only)
export const debugCreateApproved = async (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ message: 'Not allowed in production' });

  const payload = {
    deferralNumber: `DEF-DEV-${Date.now()}`,
    dclNumber: 'DCL-DEV',
    customerName: 'Dev Customer',
    customerNumber: `DEV-${Math.floor(Math.random() * 10000)}`,
    loanType: 'Test',
    deferralTitle: 'Dev Approved',
    deferralType: 'New',
    status: 'approved',
    daysSought: 1,
    slaExpiry: new Date().toISOString(),
    approvedBy: 'DevTest',
    approvedDate: new Date(),
    approvers: [],
    history: [{ action: 'completed', userName: 'DevTest', notes: 'Forced approved', date: new Date() }]
  };

  const d = await Deferral.create(payload);
  console.info('debugCreateApproved created', { id: d._id.toString(), deferralNumber: d.deferralNumber });
  res.json(d);
};
    