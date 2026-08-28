/**
 * Website Leads backend for shashwatyadav.in's unified contact form.
 * Bound to the "Website Leads — shashwatyadav.in" Google Sheet — paste this
 * into that Sheet's Extensions > Apps Script editor (see ../apps-script/DEPLOY.md
 * for the full step-by-step). Uses getActiveSpreadsheet(), so no Sheet ID needed.
 *
 * Expected columns in row 1 of the main sheet (already created):
 * Submission ID | Timestamp | Name | Phone/WhatsApp | Email | Service Needed |
 * Budget Range | Message | Source Page | Status | Duplicate Flag
 */

var COLUMNS = [
  'Submission ID', 'Timestamp', 'Name', 'Phone/WhatsApp', 'Email',
  'Service Needed', 'Budget Range', 'Message', 'Source Page', 'Status', 'Duplicate Flag'
];

function doPost(e) {
  var leadsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

  try {
    var data = JSON.parse(e.postData.contents);

    // --- Honeypot check ---------------------------------------------------
    // Real visitors never see or reach this field (CSS-hidden, tabindex="-1").
    // Any value here means a bot filled every field blindly. Pretend success
    // so the bot doesn't learn it was caught, but don't write or email anything.
    if (data.website) {
      return jsonResponse({ success: true });
    }

    // --- Build the row ------------------------------------------------------
    var submissionId = generateSubmissionId();
    var timestamp = new Date();
    var duplicateFlag = checkDuplicate(leadsSheet, data.email, data.phone, timestamp);

    // Written as plain text, not appendRow(): phone numbers start with "+", which
    // Sheets auto-parses as a formula (=> corrupts to #ERROR!) unless the range is
    // explicitly forced to plain-text format before the values are set.
    var newRow = leadsSheet.getLastRow() + 1;
    var rowValues = [
      submissionId,
      timestamp,
      data.name || '',
      data.phone || '',
      data.email || '',
      data.service || '',
      data.budget || '',
      data.message || '',
      data.source_page || '',
      '', // Status — left blank, filled in manually
      duplicateFlag
    ];
    leadsSheet.getRange(newRow, 1, 1, rowValues.length).setNumberFormat('@').setValues([rowValues]);

    // --- Notifications --------------------------------------------------
    // Both sent from the default Gmail account this script runs under
    // (no "from" override — switch to a branded address later once that's set up).
    var ownerEmail = Session.getEffectiveUser().getEmail();
    sendOwnerNotification(ownerEmail, submissionId, data);

    if (data.email) {
      sendVisitorConfirmation(data.email, data.name);
    }

    return jsonResponse({ success: true, submissionId: submissionId });

  } catch (err) {
    logError(err);
    // Still return a response so the visitor's form shows a real (not broken)
    // error state — the frontend falls back to a WhatsApp link on success:false.
    return jsonResponse({ success: false, error: 'internal_error' });
  }
}

function generateSubmissionId() {
  var datePart = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  var randomPart = Math.random().toString(36).substring(2, 7); // 5 random base36 chars
  return 'LEAD-' + datePart + '-' + randomPart;
}

// Flags "Yes" if the same email OR phone appears in a row from the last 24 hours.
// Still logs the new submission either way — this never blocks a real duplicate lead.
function checkDuplicate(sheet, email, phone, now) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 'No'; // only the header row exists so far

  var values = sheet.getRange(2, 1, lastRow - 1, COLUMNS.length).getValues();
  var cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var rowTimestamp = row[1];
    var rowEmail = row[4];
    var rowPhone = row[3];

    if (!(rowTimestamp instanceof Date) || rowTimestamp < cutoff) continue;

    var emailMatches = email && rowEmail && String(rowEmail).toLowerCase() === String(email).toLowerCase();
    var phoneMatches = phone && rowPhone && String(rowPhone) === String(phone);

    if (emailMatches || phoneMatches) return 'Yes';
  }

  return 'No';
}

// Both emails send FROM this address instead of the script's raw Gmail account.
// Requires support@shashwatyadav.in to be verified as a "Send As" alias in
// shashwatyadav012345@gmail.com's Gmail settings first (Settings > Accounts and
// Import > Send mail as) — see ../apps-script/DEPLOY.md for the exact steps.
// If it's not verified yet, GmailApp.sendEmail silently falls back to the
// account's own address rather than failing, so emails will still go out either way.
var SENDER_EMAIL = 'support@shashwatyadav.in';
var SENDER_NAME = 'Shashwat Yadav';

function sendOwnerNotification(ownerEmail, submissionId, data) {
  var subject = 'New Website Lead: ' + (data.name || 'Unknown') + ' — ' + (data.service || 'General');
  var body =
    'New lead from shashwatyadav.in\n\n' +
    'Submission ID: ' + submissionId + '\n' +
    'Name: ' + (data.name || '-') + '\n' +
    'Phone/WhatsApp: ' + (data.phone || '-') + '\n' +
    'Email: ' + (data.email || '(not provided)') + '\n' +
    'Service Needed: ' + (data.service || '-') + '\n' +
    'Budget Range: ' + (data.budget || '(not provided)') + '\n' +
    'Source Page: ' + (data.source_page || '-') + '\n\n' +
    'Message:\n' + (data.message || '-');

  GmailApp.sendEmail(ownerEmail, subject, body, { from: SENDER_EMAIL, name: SENDER_NAME });
}

function sendVisitorConfirmation(visitorEmail, visitorName) {
  var firstName = (visitorName || '').trim().split(' ')[0] || 'there';
  var subject = 'Thanks for reaching out!';
  var body =
    'Hi ' + firstName + ',\n\n' +
    "Thanks for reaching out through my website! I've received your message " +
    "and will get back to you within 24 hours.\n\n" +
    'In the meantime, feel free to WhatsApp me directly if it\'s urgent: ' +
    'https://wa.me/917000198366\n\n' +
    'Talk soon,\nShashwat';

  GmailApp.sendEmail(visitorEmail, subject, body, { from: SENDER_EMAIL, name: SENDER_NAME });
}

function logError(err) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var errorSheet = ss.getSheetByName('Errors');
    if (!errorSheet) {
      errorSheet = ss.insertSheet('Errors');
      errorSheet.appendRow(['Timestamp', 'Error Message', 'Stack']);
    }
    errorSheet.appendRow([new Date(), err.message || String(err), err.stack || '']);
  } catch (loggingErr) {
    // If even error logging fails, there's nothing more we can do here —
    // the caller's catch block still returns a safe response to the visitor.
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
