import connectDB from '../config/db.js';
import Deferral from '../models/Deferral.js';

(async () => {
  try {
    await connectDB();
    const total = await Deferral.countDocuments();
    const approved = await Deferral.countDocuments({ status: 'approved' });
    const approvedDocs = await Deferral.find({ status: 'approved' }).select('deferralNumber approvedBy approvedDate').lean();
    console.log('counts', { total, approved });
    console.log(JSON.stringify(approvedDocs, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('ERR', e);
    process.exit(1);
  }
})();