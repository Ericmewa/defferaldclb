import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Deferral from '../models/Deferral.js';

dotenv.config();

const run = async () => {
  await connectDB();
  const num = process.argv[2];
  if (!num) {
    console.error('Usage: node checkDefExists.js <DEF-NUMBER>');
    process.exit(1);
  }

  const def = await Deferral.findOne({ deferralNumber: num }).select('deferralNumber documents');
  if (!def) {
    console.log('NOTFOUND');
    process.exit(0);
  }
  console.log('FOUND count docs=' + (def.documents ? def.documents.length : 0));
  process.exit(0);
};

run().catch(err => { console.error(err); process.exit(2); });
