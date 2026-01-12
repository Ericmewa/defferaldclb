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
    <p style="margin-top:12px">Please review and take action: <a href="${link}">${link}</a></p>
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
    <p style="margin-top:12px">Please review and take action: <a href="${link}">${link}</a></p>
    <p style="font-size:12px;color:#666">This is an automated notification.</p>
  </div>
  `;
}

export function deferralFinalNotification(deferral, coEmail, link) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #222;">
      <h3>Deferral Approved: ${deferral.deferralNumber}</h3>
      <p>The deferral has completed approvals and was approved on ${deferral.approvedDate ? new Date(deferral.approvedDate).toLocaleString() : 'N/A'}.</p>
      <p>View details: <a href="${link}">${link}</a></p>
      <p style="font-size:12px;color:#666">This is an automated notification.</p>
    </div>
  `;
}
