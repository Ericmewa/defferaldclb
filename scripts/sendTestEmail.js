import dotenv from 'dotenv';
import { sendEmail } from '../services/emailService.js';

dotenv.config();

(async () => {
  try {
    const testEmail = 'ericouma4188@gmail.com';
    
    console.log(`Sending test email to: ${testEmail}`);
    await sendEmail({ to: testEmail, subject: 'Test email from deferrals app', text: 'This is a test message.' });
    console.log('✓ Test email sent successfully');
  } catch (err) {
    console.error('✗ Test send failed', err?.message || err);
    process.exit(1);
  }
})();
