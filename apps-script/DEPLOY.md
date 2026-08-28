# Deploying the Website Leads backend

This can't be done via API — Google requires a human to click through the
deployment and authorization prompts. Here's exactly what to do.

## 1. Open the Sheet and attach the script

1. Open the Sheet: https://docs.google.com/spreadsheets/d/10B9S-Ig5oglLshNcu1WNRfx4jsUKxgIa1kpsSVK8jy0/edit
2. **Extensions → Apps Script**
3. Delete whatever's in the default `Code.gs` editor
4. Paste in the entire contents of [Code.gs](Code.gs) from this folder
5. Click the save icon (or Ctrl+S)
6. Name the project something like "Website Leads Backend" when prompted

## 2. Deploy as a Web App

1. Click **Deploy → New deployment**
2. Click the gear icon next to "Select type" → choose **Web app**
3. Fill in:
   - Description: anything, e.g. "v1"
   - Execute as: **Me** (your account)
   - Who has access: **Anyone**
4. Click **Deploy**
5. Google will prompt you to **authorize permissions** — click through it (Advanced → Go to [project name] if it warns about an unverified app, since this is your own script). It needs Sheets access (to write rows) and Gmail send access (for the notification/confirmation emails).
6. Copy the **Web app URL** it gives you (looks like `https://script.google.com/macros/s/AK.../exec`)

## 3. Hand the URL back

Give me that URL. I'll paste it into `LEADS_SCRIPT_URL` at the top of
`assets/js/main.js` (currently a placeholder: `PASTE_YOUR_DEPLOYED_WEB_APP_URL_HERE`),
then we'll run through the test checklist together.

## 4. Send emails from support@shashwatyadav.in instead of the raw Gmail address

Both emails (the lead notification to you and the confirmation to the
visitor) are set up to send from `support@shashwatyadav.in`. Gmail won't
let a script send *as* an address it hasn't verified you control, so this
needs a one-time setup:

1. **Make sure the mailbox exists on Hostinger first** — hPanel → Emails →
   confirm `support@shashwatyadav.in` exists (create it if not, with a
   password you'll use below)
2. Get that mailbox's **outgoing (SMTP) server details** — hPanel → Emails →
   your email account → "Connect Devices" or "Configure Email Client" — note
   the SMTP host (commonly `smtp.hostinger.com` or `smtp.titan.email`
   depending on your plan), port (465 or 587), and that the login is the
   full email address + its password
3. Log into **shashwatyadav012345@gmail.com** in Gmail (the account the
   script runs as)
4. **Settings (gear icon) → See all settings → Accounts and Import** tab
5. Under "Send mail as" → **Add another email address**
6. Name: `Shashwat Yadav`, Email: `support@shashwatyadav.in` → Next Step
7. Enter the SMTP details from step 2 → **Add Account**
8. Gmail sends a verification email to `support@shashwatyadav.in` — log
   into that mailbox (Hostinger webmail) to find it, then click the
   confirmation link (or paste the code back into the Gmail dialog)

Once verified, `GmailApp.sendEmail(..., {from: SENDER_EMAIL, ...})` in the
code actually sends as that address. **Until it's verified, Gmail silently
sends from the script's own address instead of failing** — so nothing
breaks in the meantime, emails just won't look branded yet.

After verifying, if the code changed since your last deploy, push a new
version (see below) — the alias itself doesn't need a redeploy, only code
changes do.

## Note for future updates

If you ever need to change the script's code later, edit it in the Apps
Script editor, then **Deploy → Manage deployments → edit (pencil icon) →
New version → Deploy**. Just saving the code without creating a new
deployment version does *not* update the live Web App — this trips people
up constantly with Apps Script.
