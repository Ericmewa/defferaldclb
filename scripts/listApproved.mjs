import connectDB from '../config/db.js';
import Deferral from '../models/Deferral.js';

(async () => {
  try {
    await connectDB();
    const approved = await Deferral.find({ status: 'approved' }).select('deferralNumber approvedBy approvedDate status').lean();
    console.log(JSON.stringify(approved, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('ERR', e);
    process.exit(1);
  }
})();