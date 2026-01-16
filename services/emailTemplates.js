export function deferralSubmissionTemplate(deferral, approver, link) {
  const rows = [
    ['Deferral No', deferral.deferralNumber],
    ['Customer', deferral.customerName || deferral.requestor?.name || '—'],
    ['DCL No', deferral.dclNumber || '—'],
    ['Days Sought', (deferral.daysSought || '—') + (deferral.daysSought ? ' days' : '')],
  ];
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; color: #222;">
    <h3>Deferral Request awaiting your approval</h3>
    <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
      ${rows.map(r => `<tr><td style="padding:6px 8px;border:1px solid #eee;font-weight:600">${r[0]}</td><td style="padding:6px 8px;border:1px solid #eee">${r[1] || ''}</td></tr>`).join('')}
    </table>
    <p style="margin-top:20px">
      <a href="${link}" style="display:inline-block;background-color:#164679;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:600">Review Deferral</a>
    </p>
    <p style="font-size:12px;color:#666">This is an automated notification.</p>
  </div>
  `;
}

export function deferralApprovalTemplate(deferral, nextApprover, link) {
  const rows = [
    ['Deferral No', deferral.deferralNumber],
    ['Customer', deferral.customerName || deferral.requestor?.name || '—'],
    ['Status', deferral.status],
  ];
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; color: #222;">
    <h3>Deferral moved to you for approval</h3>
    <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
      ${rows.map(r => `<tr><td style="padding:6px 8px;border:1px solid #eee;font-weight:600">${r[0]}</td><td style="padding:6px 8px;border:1px solid #eee">${r[1] || ''}</td></tr>`).join('')}
    </table>
    <p style="margin-top:20px">
      <a href="${link}" style="display:inline-block;background-color:#164679;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:600">Review Deferral</a>
    </p>
    <p style="font-size:12px;color:#666">This is an automated notification.</p>
  </div>
  `;
}

export function deferralReminderTemplate(deferral, approverName, link) {
  const rows = [
    ['Deferral No', deferral.deferralNumber],
    ['Customer', deferral.customerName || deferral.requestor?.name || '—'],
    ['Days Sought', (deferral.daysSought || '—') + (deferral.daysSought ? ' days' : '')],
  ];
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; color: #222;">
    <h3>Reminder: Deferral awaiting your approval</h3>
    <p>Hi ${approverName || 'Approver'},</p>
    <p>This is a friendly reminder to review the deferral below and take action:</p>
    <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
      ${rows.map(r => `<tr><td style="padding:6px 8px;border:1px solid #eee;font-weight:600">${r[0]}</td><td style="padding:6px 8px;border:1px solid #eee">${r[1] || ''}</td></tr>`).join('')}
    </table>
    <p style="margin-top:20px">
      <a href="${link}" style="display:inline-block;background-color:#164679;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:600">Open Approval Page</a>
    </p>
    <p style="font-size:12px;color:#666">This is an automated reminder.</p>
  </div>
  `;
}

export function deferralFinalNotification(deferral, coEmail, link) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #222;">
      <h3>Deferral Approved: ${deferral.deferralNumber}</h3>
      <p>The deferral has completed approvals and was approved on ${deferral.approvedDate ? new Date(deferral.approvedDate).toLocaleString() : 'N/A'}.</p>
      <p style="margin-top:20px">
        <a href="${link}" style="display:inline-block;background-color:#164679;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:600">View Deferral Details</a>
      </p>
      <p style="font-size:12px;color:#666">This is an automated notification.</p>
    </div>
  `;
}

export function deferralRejectionTemplate(deferral, reason, detailLink, listLink) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #222;">
      <h3>Deferral Rejected: ${deferral.deferralNumber}</h3>
      <p>Your deferral request has been <strong>rejected</strong> by the approver.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p style="margin-top:20px">
        <a href="${detailLink}" style="display:inline-block;background-color:#164679;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:600;margin-right:12px">View Details</a>
        <a href="${listLink}" style="display:inline-block;background-color:#666;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:600">View Rejected Deferrals</a>
      </p>
      <p style="font-size:12px;color:#666;margin-top:20px">This is an automated notification.</p>
    </div>
  `;
}
