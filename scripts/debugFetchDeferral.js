import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Deferral from '../models/Deferral.js';
import fs from 'fs';

dotenv.config();

const run = async () => {
  await connectDB();
  const num = process.argv[2];
  if (!num) {
    console.error('Usage: node debugFetchDeferral.js <DEF-NUMBER>');
    process.exit(1);
  }

  const def = await Deferral.findOne({ deferralNumber: num })
    .populate('documents')
    .populate('approvers.user', 'name email position')
    .populate('requestor', 'name email')
    .populate('history.user', 'name email');

  if (!def) {
    console.error('Deferral not found');
    process.exit(2);
  }

  const outPath = `C:/Users/Eric.Mewa/dclb/scripts/debug-deferral-${num.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
  const payload = JSON.stringify(def.toObject({ getters: true, virtuals: false }), null, 2);
  await fs.promises.writeFile(outPath, payload, 'utf8');
  console.log('Written debug file to', outPath);
  // Also print a compact JSON to stdout for quick inspection
  console.log(payload);
  process.exit(0);
};

run().catch(err => { console.error(err); process.exit(3); });
