# Email notifications (SMTP)

This project supports real-time SMTP email notifications for deferral submission and approval flow.

## Environment variables

Add the following to your environment (or copy `.env.example`):

- SMTP_HOST — e.g. `smtp.gmail.com`
- SMTP_PORT — e.g. `465` (SSL) or `587` (STARTTLS)
- SMTP_USER — SMTP username (for Gmail, your email address)
- SMTP_PASS — SMTP password or app-specific password / OAuth token
- SMTP_SECURE — `true` for port 465 (SSL), `false` for 587
- EMAIL_FROM — optional from address (e.g. "Deferrals <noreply@yourdomain.com>")
- FRONTEND_URL — frontend base URL used to build approval links (e.g. `http://localhost:5173`)
- CO_EMAIL — optional fallback CO email

## Gmail notes

For Gmail accounts, you should create an App Password (recommended) or configure OAuth2. Ensure less secure app access is disabled and MFA/app passwords are used.

## How it works

- On deferral creation: the first approver (if email available) receives an email with a link to the **login** page which redirects to the approver view.
- On each approval: the next approver receives an email with a login link that redirects to the approver view; when approvals complete, a final notification is sent to the CO email (if provided) or fallback CO_EMAIL.
- On rejection: the requestor (RM) will receive an email notifying them of the rejection with the provided reason and a link to view the deferral; an in-app notification is also created for the RM.

## Testing locally

- Use real SMTP credentials to hit Gmail (ensure app password configured).
- Or use a local SMTP catcher like MailHog to inspect messages.
- To verify the login redirect behavior: create a deferral with a test approver email, open the received email and confirm the link points to `/login?next=...`; after signing in using that account, you should be redirected to the approver view for the deferral.

## Notes

- Email sending is non-blocking; if sending fails it will not make the API request fail — failures are logged.
- For production, consider moving sends into a background queue for retries and better throughput.
