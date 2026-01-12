import connectDB from '../config/db.js';
import User from '../models/User.js';
import Deferral from '../models/Deferral.js';

(async () => {
  try {
    await connectDB();

    // Ensure four users exist: A1, A2, A3, CO
    const names = ['Approver One', 'Approver Two', 'Approver Three', 'CO Final'];
    const users = {};

    for (const name of names) {
      let u = await User.findOne({ name });
      if (!u) {
        u = await User.create({ name, email: `${name.replace(/\s+/g, '').toLowerCase()}@example.com`, password: 'password123' });
        console.log('Created user', name, u._id.toString());
      } else {
        console.log('Found user', name, u._id.toString());
      }
      users[name] = u;
    }

    // Create a deferral with these approvers in order
    const payload = {
      deferralNumber: `DEF-E2E-${Date.now()}`,
      dclNumber: 'DCL-E2E',
      customerName: 'E2E Customer',
      customerNumber: `E2E-${Math.floor(Math.random()*10000)}`,
      loanType: 'Test Loan',
      deferralTitle: 'E2E Approval Test',
      deferralType: 'New',
      status: 'pending_approval',
      daysSought: 10,
      slaExpiry: new Date().toISOString(),
      approvers: [
        { role: 'Approver 1', user: users['Approver One']._id },
        { role: 'Approver 2', user: users['Approver Two']._id },
        { role: 'Approver 3', user: users['Approver Three']._id },
        { role: 'CO', user: users['CO Final']._id },
      ],
      currentApproverIndex: 0,
      history: []
    };

    const d = await Deferral.create(payload);
    console.log('Created deferral', d.deferralNumber, d._id.toString());

    // Simulate sequential approvals
    for (let i = 0; i < d.approvers.length; i++) {
      const approver = d.approvers[i];
      console.log(`-- Simulating approval by ${approver.role} (${approver.user.toString()})`);

      d.approvers[i].approved = true;
      d.approvers[i].approvedAt = new Date();
      d.history = d.history || [];
      d.history.push({ action: 'approved', user: approver.user, userName: approver.role, notes: `Auto-approved by ${approver.role}`, date: new Date() });

      if (i + 1 < d.approvers.length) {
        d.currentApproverIndex = i + 1;
        d.status = 'in_review';
        d.history.push({ action: 'moved', user: approver.user, userName: approver.role, notes: `Moved to next approver`, date: new Date() });
        console.log('Moved to next approver; status -> in_review');
      } else {
        d.status = 'approved';
        d.approvedBy = approver.role;
        d.approvedById = approver.user;
        d.approvedDate = new Date();
        d.history.push({ action: 'completed', user: approver.user, userName: approver.role, notes: `Final approval completed`, date: new Date() });
        console.log('Final approval done; status -> approved');
      }

      await d.save();
      console.log('Saved deferral; current status:', d.status);
    }

    // List approved deferrals
    const approved = await Deferral.find({ status: 'approved' }).select('deferralNumber approvedBy approvedById approvedDate status').lean();
    console.log('Approved deferrals (matching test):');
    console.log(JSON.stringify(approved, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('E2E ERROR', err);
    process.exit(1);
  }
})();