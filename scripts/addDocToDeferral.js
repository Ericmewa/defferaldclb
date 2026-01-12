import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Deferral from '../models/Deferral.js';
import fs from 'fs';
import path from 'path';

dotenv.config();

const run = async () => {
  await connectDB();
  const def = process.argv[2];
  if (!def) {
    console.error('Usage: node addDocToDeferral.js <DEF-NUMBER or DEF-ID>');
    process.exit(1);
  }

  // Source test file
  const src = path.join(process.cwd(), 'scripts', 'test_logbook.pdf');
  if (!fs.existsSync(src)) {
    console.error('Test file not found at', src);
    process.exit(2);
  }

  const destDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const destName = `${Date.now()}-test_logbook.pdf`;
  const dest = path.join(destDir, destName);
  fs.copyFileSync(src, dest);

  const url = `/uploads/${destName}`;

  // Try find by deferralNumber else by _id
  const query = def.startsWith('DEF-') ? { deferralNumber: def } : { _id: def };
  const d = await Deferral.findOne(query);
  if (!d) {
    console.error('Deferral not found for', def);
    process.exit(3);
  }

  d.documents.push({ name: 'logbook.pdf', url, size: fs.statSync(dest).size, uploadDate: new Date(), isAdditional: true });
  await d.save();
  console.log('Added document to', d.deferralNumber, 'url=', url);
  process.exit(0);
};

run().catch(err => { console.error(err); process.exit(9); });
