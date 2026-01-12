import connectDB from '../config/db.js';
import Deferral from '../models/Deferral.js';

(async () => {
  try {
    await connectDB();
    const payload = {
      deferralNumber: `DEF-TEST-${Date.now()}`,
      dclNumber: 'DCL-TEST',
      customerName: 'Test Insert',
      customerNumber: `TEST-${Math.floor(Math.random()*10000)}`,
      loanType: 'Test Loan',
      deferralTitle: 'Inserted Approved Deferral',
      deferralType: 'New',
      status: 'approved',
      daysSought: 10,
      slaExpiry: new Date().toISOString(),
      approvedBy: 'AutomatedTest',
      approvedDate: new Date(),
      approvers: [],
      history: [{ action: 'completed', userName: 'AutomatedTest', notes: 'Inserted approved for test', date: new Date() }]
    };

    const d = await Deferral.create(payload);
    console.log('INSERTED', { id: d._id.toString(), deferralNumber: d.deferralNumber, status: d.status, approvedBy: d.approvedBy, approvedDate: d.approvedDate });
    process.exit(0);
  } catch (err) {
    console.error('ERROR', err);
    process.exit(1);
  }
})();