/**
 * services/emailService.js
 * Nodemailer-based email notification service.
 * Reads SMTP config from env: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM
 */
const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  const host = process.env.EMAIL_HOST;
  if (!host) return null; // Email not configured — fail silently
  transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return transporter;
};

const FROM = () => process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@medicalcrm.app';

// ── Send raw email ──────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html, text }) => {
  const t = getTransporter();
  if (!t || !to) return { skipped: !t ? 'email not configured' : 'no recipient' };
  try {
    const info = await t.sendMail({ from: FROM(), to, subject, html, text });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[email] Send error:', err.message);
    return { success: false, error: err.message };
  }
};

// ── Email Templates ─────────────────────────────────────────────────────

const appointmentConfirmationEmail = ({ clinicName, patientName, date, time, patientEmail }) => ({
  to: patientEmail,
  subject: `Appointment Confirmed — ${clinicName}`,
  html: `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <div style="background:#0f4c75;padding:24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:22px">🏥 ${clinicName}</h1>
      </div>
      <div style="padding:28px">
        <h2 style="color:#1e293b;margin-top:0">Appointment Confirmed ✅</h2>
        <p style="color:#475569">Hi <strong>${patientName}</strong>,</p>
        <p style="color:#475569">Your appointment has been confirmed.</p>
        <div style="background:#f0f9ff;border-left:4px solid #0f4c75;border-radius:6px;padding:16px;margin:20px 0">
          <p style="margin:4px 0;color:#1e293b"><strong>📅 Date:</strong> ${date}</p>
          <p style="margin:4px 0;color:#1e293b"><strong>⏰ Time:</strong> ${time}</p>
        </div>
        <p style="color:#64748b;font-size:13px">Please arrive 10 minutes early. Reply to this email or call us if you need to reschedule.</p>
      </div>
      <div style="background:#f8fafc;padding:14px;text-align:center;border-top:1px solid #e2e8f0">
        <p style="color:#94a3b8;font-size:12px;margin:0">${clinicName} — Powered by Medical CRM</p>
      </div>
    </div>
  `,
  text: `Hi ${patientName},\n\nYour appointment at ${clinicName} is confirmed.\nDate: ${date}\nTime: ${time}\n\nPlease arrive 10 minutes early.\n\n— ${clinicName}`,
});

const appointmentReminderEmail = ({ clinicName, patientName, date, time, patientEmail, hoursAhead }) => ({
  to: patientEmail,
  subject: `Reminder: Appointment in ${hoursAhead} hours — ${clinicName}`,
  html: `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <div style="background:#7c3aed;padding:24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:22px">⏰ Appointment Reminder</h1>
      </div>
      <div style="padding:28px">
        <p style="color:#475569">Hi <strong>${patientName}</strong>,</p>
        <p style="color:#475569">This is a reminder for your upcoming appointment at <strong>${clinicName}</strong>.</p>
        <div style="background:#faf5ff;border-left:4px solid #7c3aed;border-radius:6px;padding:16px;margin:20px 0">
          <p style="margin:4px 0;color:#1e293b"><strong>📅 Date:</strong> ${date}</p>
          <p style="margin:4px 0;color:#1e293b"><strong>⏰ Time:</strong> ${time}</p>
        </div>
      </div>
    </div>
  `,
  text: `Hi ${patientName},\n\nReminder: Your appointment at ${clinicName} is in ${hoursAhead} hours.\nDate: ${date} at ${time}\n\n— ${clinicName}`,
});

const followupReminderEmail = ({ clinicName, patientName, followupDate, followupType, patientEmail }) => ({
  to: patientEmail,
  subject: `Follow-up Reminder — ${clinicName}`,
  html: `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <div style="background:#0369a1;padding:24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:22px">🔔 Follow-up Reminder</h1>
      </div>
      <div style="padding:28px">
        <p style="color:#475569">Hi <strong>${patientName}</strong>,</p>
        <p style="color:#475569">Your <strong>${followupType || 'follow-up'}</strong> is scheduled for <strong>${followupDate}</strong>.</p>
        <p style="color:#475569">Please contact <strong>${clinicName}</strong> to schedule your visit.</p>
      </div>
    </div>
  `,
  text: `Hi ${patientName},\n\nYour ${followupType || 'follow-up'} appointment at ${clinicName} is due on ${followupDate}.\nPlease call us to schedule your visit.\n\n— ${clinicName}`,
});

const dailySummaryEmail = ({ clinicName, staffName, appointments, date, staffEmail }) => {
  const rows = appointments.map(a =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${a.appointmentTime}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${a.patientName}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${a.reason || '—'}</td></tr>`
  ).join('');
  return {
    to: staffEmail,
    subject: `Today's Schedule — ${date} | ${clinicName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:#0f4c75;padding:20px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:20px">📅 Daily Schedule — ${date}</h1>
          <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px">${clinicName}</p>
        </div>
        <div style="padding:24px">
          <p style="color:#475569">Good morning <strong>${staffName}</strong>! Here are today's appointments:</p>
          ${appointments.length ? `
          <table style="width:100%;border-collapse:collapse;margin-top:16px">
            <thead><tr style="background:#f0f9ff">
              <th style="padding:10px 12px;text-align:left;color:#0f4c75;font-size:13px">Time</th>
              <th style="padding:10px 12px;text-align:left;color:#0f4c75;font-size:13px">Patient</th>
              <th style="padding:10px 12px;text-align:left;color:#0f4c75;font-size:13px">Reason</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>` : '<p style="color:#94a3b8;text-align:center;padding:20px">No appointments scheduled for today.</p>'}
          <p style="color:#94a3b8;font-size:12px;margin-top:20px">Total: ${appointments.length} appointment(s)</p>
        </div>
      </div>
    `,
    text: `Good morning ${staffName}!\n\n${clinicName} — Today's Schedule (${date})\n\n${appointments.map(a => `${a.appointmentTime} — ${a.patientName}${a.reason ? ' (' + a.reason + ')' : ''}`).join('\n') || 'No appointments today.'}\n\nTotal: ${appointments.length} appointment(s)`,
  };
};

module.exports = {
  sendEmail,
  appointmentConfirmationEmail,
  appointmentReminderEmail,
  followupReminderEmail,
  dailySummaryEmail,
};
