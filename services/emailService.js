import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = (process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === true);
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER;

console.debug('Email service config:', { SMTP_HOST: SMTP_HOST ? 'set' : 'missing', SMTP_PORT, SMTP_USER: SMTP_USER ? 'set' : 'missing', SMTP_SECURE });

let transporter;

function createTransporter() {
  if (!SMTP_HOST || !SMTP_PORT) {
    console.warn('SMTP not configured (missing SMTP_HOST/SMTP_PORT)');
    return null;
  }
  console.debug('Creating SMTP transporter:', { host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_SECURE, hasAuth: !!(SMTP_USER && SMTP_PASS) });
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
}

export async function sendEmail({ to, subject, html, text }) {
  if (!to) throw new Error('Missing recipient');
  try {
    transporter = transporter || createTransporter();
    if (!transporter) throw new Error('SMTP transporter not configured');
    const info = await transporter.sendMail({ from: EMAIL_FROM, to, subject, text, html });
    console.info('Email sent', { to, subject, messageId: info && info.messageId });
    return info;
  } catch (err) {
    console.error('Failed to send email', err && err.message ? err.message : err);
    throw err;
  }
}

export default { sendEmail };