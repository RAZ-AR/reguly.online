// ============================================================
// Reguly — Google Apps Script
// Paste this entire file into script.google.com
// Deploy as Web App: Execute as Me, Anyone can access
// ============================================================

const SHEET_NAME  = 'Leads';
const DEADLINE    = new Date('2026-05-20T00:00:00');
const FROM_NAME   = 'Reguly';
const REPLY_TO    = 'hello@reguly.online';
const SITE_URL    = 'https://reguly.online/';

// Column indexes (0-based)
const COL = {
  timestamp:        0,
  email:            1,
  country:          2,
  city:             3,
  address:          4,
  fine:             5,
  authority:        6,
  note:             7,
  action:           8,
  confirmSent:      9,
  reminder30Sent:   10,
  reminder7Sent:    11,
  reminder1Sent:    12,
};

// ============================================================
// Entry point — receives POST from reguly.online
// ============================================================
function doPost(e) {
  try {
    const p = e.parameter;
    const sheet = getOrCreateSheet();

    const email     = (p.email     || '').trim().toLowerCase();
    const country   = p.country   || '';
    const city      = p.city      || '';
    const address   = p.address   || '';
    const fine      = p.fine      || '';
    const authority = p.authority || '';
    const note      = p.note      || '';
    const action    = p.action    || 'check';

    if (!isValidEmail(email)) {
      return ok('Invalid email');
    }

    const rows       = sheet.getDataRange().getValues();
    const existingIdx = findRow(rows, email, city); // row index in array (0=header)

    if (existingIdx === -1) {
      // New lead — append row and send confirmation
      sheet.appendRow([
        new Date(), email, country, city, address,
        fine, authority, note, action,
        false, false, false, false
      ]);
      sendConfirmation(email, city, address, fine, authority, note);
      // Mark confirmation sent
      sheet.getRange(sheet.getLastRow(), COL.confirmSent + 1).setValue(true);
    }
    // If existing and action=reminder — nothing extra, reminders go via daily trigger

    setupDailyTrigger();
    return ok('OK');

  } catch (err) {
    Logger.log(err);
    return ok('Error: ' + err.message);
  }
}

// ============================================================
// Daily trigger — sends reminders at 30 / 7 / 1 day
// ============================================================
function sendDailyReminders() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((DEADLINE - today) / 86400000);

  if (daysLeft <= 0) return; // deadline passed

  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    const row       = rows[i];
    const email     = (row[COL.email]   || '').trim();
    const city      = row[COL.city]     || '';
    const address   = row[COL.address]  || '';
    const fine      = row[COL.fine]     || '';
    const authority = row[COL.authority]|| '';

    if (!isValidEmail(email)) continue;

    try {
      if (daysLeft === 30 && !row[COL.reminder30Sent]) {
        sendReminder(email, city, address, fine, authority, 30);
        sheet.getRange(i + 1, COL.reminder30Sent + 1).setValue(true);
        Utilities.sleep(300);
      } else if (daysLeft === 7 && !row[COL.reminder7Sent]) {
        sendReminder(email, city, address, fine, authority, 7);
        sheet.getRange(i + 1, COL.reminder7Sent + 1).setValue(true);
        Utilities.sleep(300);
      } else if (daysLeft === 1 && !row[COL.reminder1Sent]) {
        sendReminder(email, city, address, fine, authority, 1);
        sheet.getRange(i + 1, COL.reminder1Sent + 1).setValue(true);
        Utilities.sleep(300);
      }
    } catch (err) {
      Logger.log('Failed: ' + email + ' — ' + err.message);
    }
  }
}

// ============================================================
// Email: Confirmation
// ============================================================
function sendConfirmation(email, city, address, fine, authority, note) {
  const daysLeft = Math.ceil((DEADLINE - new Date()) / 86400000);
  const subject  = 'Your Reguly Compliance Report — ' + city;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{margin:0;padding:0;background:#f3f3f3;font-family:Arial,sans-serif;}
  .wrap{max-width:560px;margin:0 auto;background:#fff;}
  .hdr{background:#111;padding:24px 32px;}
  .hdr-title{color:#fff;font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:-0.04em;margin:0;}
  .hdr-sub{color:rgba(255,255,255,0.35);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;margin-top:4px;}
  .body{padding:28px 32px;}
  .badge{background:#df5a48;color:#fff;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;padding:5px 12px;display:inline-block;margin-bottom:18px;}
  .intro{font-size:15px;font-weight:700;color:#111;margin-top:0;margin-bottom:20px;}
  table{width:100%;border-collapse:collapse;}
  td{padding:11px 0;border-bottom:1px solid #eee;vertical-align:top;}
  .lbl{font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:0.18em;color:#aaa;display:block;margin-bottom:3px;}
  .val{font-size:13px;font-weight:700;color:#111;}
  .fine{font-size:22px;font-weight:900;color:#df5a48;}
  .note-text{font-size:11px;color:#555;line-height:1.55;margin-top:4px;}
  .cta{display:block;background:#df5a48;color:#fff;text-decoration:none;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;padding:17px 32px;text-align:center;margin:24px 0 20px;}
  .steps{background:#f8f8f8;border-left:3px solid #df5a48;padding:14px 18px;font-size:12px;color:#333;line-height:1.8;}
  .steps strong{color:#111;}
  .ftr{background:#111;padding:14px 32px;text-align:center;}
  .ftr p{color:rgba(255,255,255,0.25);font-size:9px;margin:0;line-height:1.7;}
  .ftr a{color:rgba(255,255,255,0.4);}
</style></head><body>
<div class="wrap">
  <div class="hdr">
    <div class="hdr-title">REGULY</div>
    <div class="hdr-sub">EU Regulation 2024/1028 · reguly.online</div>
  </div>
  <div class="body">
    <div class="badge">⚠ Registration Required</div>
    <p class="intro">Your compliance check for <strong>${address}, ${city}</strong> is ready.</p>
    <table>
      <tr><td>
        <span class="lbl">EU Deadline</span>
        <span class="val">May 20, 2026 &nbsp;·&nbsp; <strong style="color:#df5a48;">${daysLeft} days left</strong></span>
      </td></tr>
      <tr><td>
        <span class="lbl">Max Fine</span>
        <span class="val fine">${fine}</span>
      </td></tr>
      <tr><td>
        <span class="lbl">Registration Authority</span>
        <span class="val">${authority}</span>
      </td></tr>
      <tr><td style="border-bottom:none;">
        <span class="lbl">Key Rule</span>
        <span class="note-text">${note}</span>
      </td></tr>
    </table>
    <a href="${SITE_URL}" class="cta">→ Download Your 5-Step Checklist (Free PDF)</a>
    <div class="steps">
      <strong>What to do before May 20:</strong><br>
      1. Go to your city registration portal<br>
      2. Gather required documents (ID, property deed, proof of residence)<br>
      3. Submit application and receive your registration number<br>
      4. Add the number to all your listings (Airbnb, Booking, etc.)<br>
      5. Set up monthly data reporting
    </div>
    <p style="font-size:10px;color:#aaa;margin-top:20px;">
      You'll receive reminder emails at <strong>30, 7 and 1 day</strong> before the deadline.
    </p>
  </div>
  <div class="ftr">
    <p>Reguly · reguly.online · EU Regulation 2024/1028</p>
    <p><a href="mailto:${REPLY_TO}?subject=unsubscribe">Unsubscribe</a></p>
  </div>
</div></body></html>`;

  GmailApp.sendEmail(email, subject, stripHtml(html), {
    htmlBody: html,
    name:     FROM_NAME,
    replyTo:  REPLY_TO,
  });
}

// ============================================================
// Email: Reminder (30 / 7 / 1 days)
// ============================================================
function sendReminder(email, city, address, fine, authority, daysLeft) {
  const isUrgent  = daysLeft <= 1;
  const isWarning = daysLeft <= 7;
  const tag       = isUrgent ? 'LAST CHANCE' : isUrgent ? 'URGENT' : 'REMINDER';
  const hdrColor  = isUrgent ? '#7f1d1d' : isWarning ? '#df5a48' : '#111111';
  const subject   = '[' + tag + '] ' + daysLeft + ' day' + (daysLeft !== 1 ? 's' : '') + ' until EU deadline — ' + city;

  const message = isUrgent
    ? 'Tomorrow is the EU deadline. If you haven\'t registered yet, Airbnb and Booking.com will automatically remove your listing.'
    : isWarning
    ? 'Only ' + daysLeft + ' days left. Your listing in ' + city + ' must have a registration number by May 20, 2026.'
    : 'One month until the EU compliance deadline. Hosts in ' + city + ' must register before May 20, 2026.';

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{margin:0;padding:0;background:#f3f3f3;font-family:Arial,sans-serif;}
  .wrap{max-width:560px;margin:0 auto;background:#fff;}
  .hdr{background:${hdrColor};padding:24px 32px;}
  .hdr-title{color:#fff;font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;margin:0;}
  .countdown{font-size:80px;font-weight:900;color:#df5a48;text-align:center;padding:28px 0 4px;line-height:1;}
  .countdown-lbl{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.3em;color:#aaa;text-align:center;padding-bottom:24px;}
  .body{padding:0 32px 32px;}
  .msg{font-size:15px;font-weight:700;color:#111;margin-bottom:14px;}
  .detail{font-size:12px;color:#555;line-height:1.7;margin-bottom:0;}
  .detail strong{color:#111;}
  .fine{color:#df5a48;font-weight:900;}
  .cta{display:block;background:#df5a48;color:#fff;text-decoration:none;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;padding:17px 32px;text-align:center;margin:24px 0;}
  .ftr{background:#111;padding:14px 32px;text-align:center;}
  .ftr p{color:rgba(255,255,255,0.25);font-size:9px;margin:0;line-height:1.7;}
  .ftr a{color:rgba(255,255,255,0.4);}
</style></head><body>
<div class="wrap">
  <div class="hdr">
    <div class="hdr-title">REGULY — ${tag}: EU Short-Term Rental Deadline</div>
  </div>
  <div class="countdown">${daysLeft}</div>
  <div class="countdown-lbl">day${daysLeft !== 1 ? 's' : ''} remaining until May 20, 2026</div>
  <div class="body">
    <p class="msg">${message}</p>
    <p class="detail">
      Property: <strong>${address}, ${city}</strong><br>
      Max fine: <strong class="fine">${fine}</strong><br>
      Authority: <strong>${authority}</strong>
    </p>
    <a href="${SITE_URL}" class="cta">→ Get Your Registration Guide Now</a>
    <p style="font-size:11px;color:#aaa;line-height:1.6;">
      EU Regulation 2024/1028 requires all short-term rental hosts to display a valid registration number on every listing. Without it, platforms must automatically delist your property.
    </p>
  </div>
  <div class="ftr">
    <p>Reguly · reguly.online · EU Regulation 2024/1028</p>
    <p><a href="mailto:${REPLY_TO}?subject=unsubscribe">Unsubscribe</a></p>
  </div>
</div></body></html>`;

  GmailApp.sendEmail(email, subject, stripHtml(html), {
    htmlBody: html,
    name:     FROM_NAME,
    replyTo:  REPLY_TO,
  });
}

// ============================================================
// Helpers
// ============================================================
function getOrCreateSheet() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let sheet   = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      'Timestamp', 'Email', 'Country', 'City', 'Address',
      'Fine', 'Authority', 'Note', 'Action',
      'Confirm Sent', 'Reminder 30', 'Reminder 7', 'Reminder 1'
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 13).setFontWeight('bold');
  }
  return sheet;
}

function findRow(rows, email, city) {
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][COL.email] || '').toLowerCase() === email &&
        rows[i][COL.city]  === city) return i;
  }
  return -1;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function ok(msg) {
  return ContentService
    .createTextOutput(msg)
    .setMimeType(ContentService.MimeType.TEXT);
}

function setupDailyTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const t of triggers) {
    if (t.getHandlerFunction() === 'sendDailyReminders') return;
  }
  ScriptApp.newTrigger('sendDailyReminders')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();
}
