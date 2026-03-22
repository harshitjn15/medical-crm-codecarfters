/**
 * bot/engine.js
 * WhatsApp Bot Engine using wa.me links for MVP + webhook receiver for Cloud API
 *
 * Architecture:
 * - MVP: Generates wa.me links; auto-messages logged then opened by cron trigger
 * - Production: Swap sendMessage() to use WhatsApp Cloud API or Baileys
 *
 * For Baileys (open source, no cost):
 *   npm install @whiskeysockets/baileys
 *   Then replace sendMessage() with Baileys socket.sendMessage()
 *
 * For WhatsApp Cloud API (Meta):
 *   Set WHATSAPP_TOKEN + WHATSAPP_PHONE_ID in .env
 *   sendMessage() uses axios to POST to graph.facebook.com
 */

const { BotConfig, BotMessage, Clinic } = require('../models');

// ── Phone formatting ────────────────────────────────────────────────────
const formatPhone = (phone, countryCode = '91') => {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith(countryCode) && digits.length > 11) return digits;
  if (digits.length === 10) return `${countryCode}${digits}`;
  return digits;
};

// ── Message Templates ───────────────────────────────────────────────────
const TEMPLATES = {
  appointment_reminder: (clinicName, patientName, date, time, locationUrl) =>
`Hi ${patientName},

This is a reminder from *${clinicName}* 🏥

Your appointment is scheduled:
📅 *Date:* ${date}
⏰ *Time:* ${time}

Please reply:
✅ *YES* to confirm
❌ *NO* to cancel or reschedule
${locationUrl ? `\n📍 *Location:* ${locationUrl}` : ''}

_${clinicName}_`,

  followup_reminder: (clinicName, patientName, date, type) =>
`Hi ${patientName},

*${clinicName}* would like to remind you about your *${type || 'follow-up'}* due on *${date}*.

Please call us to schedule your visit. 📞

_${clinicName}_`,

  review_request: (clinicName, patientName, reviewUrl) =>
`Hi ${patientName},

Thank you for visiting *${clinicName}* today! 😊

We hope your experience was great. If you have 2 minutes, we'd love a review:
⭐ ${reviewUrl || 'Please ask our staff for the review link'}

Your feedback helps us serve better!

_${clinicName}_`,

  location_share: (clinicName, locationUrl, locationLabel) =>
`📍 *${clinicName} — Location*

${locationLabel || 'Find us here:'}
${locationUrl}

We look forward to seeing you! 🏥

_${clinicName}_`,

  welcome: (clinicName, patientName) =>
`Hi ${patientName}! 👋

Welcome to *${clinicName}*. Your patient profile has been created.

You can reply to this number for:
📅 Appointment enquiries
📍 *LOCATION* — to get our address
❓ Any questions

_${clinicName}_`,

  payment_reminder: (clinicName, patientName, amount, invoiceNumber) =>
`Hi ${patientName},

This is a gentle reminder from *${clinicName}* about your pending payment.

💰 *Amount:* ₹${amount}
🧾 *Invoice:* ${invoiceNumber}

Please settle at your earliest convenience. Thank you! 🙏

_${clinicName}_`,
};

// ── Core send function ──────────────────────────────────────────────────
// In MVP: logs the message and returns a wa.me link for manual trigger
// In production with Cloud API: posts to Meta endpoint
const sendMessage = async (phone, body, clinicId, messageType, extra = {}) => {
  const cleaned = formatPhone(phone);

  // Log to database
  const msg = await BotMessage.create({
    clinicId,
    phone,
    patientId:   extra.patientId,
    patientName: extra.patientName,
    direction:   'outbound',
    messageType,
    body,
    refId:       extra.refId,
    status:      'sent',
  });

  // If WhatsApp Cloud API credentials exist, use them
  if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) {
    try {
      const axios = require('axios');
      const res = await axios.post(
        `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: cleaned,
          type: 'text',
          text: { body },
        },
        { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' } }
      );
      await BotMessage.findByIdAndUpdate(msg._id, { status: 'delivered', refId: res.data.messages?.[0]?.id });
      return { success: true, method: 'cloud_api', waLink: null };
    } catch (err) {
      await BotMessage.findByIdAndUpdate(msg._id, { status: 'failed', errorMsg: err.message });
      console.error('[bot] Cloud API error:', err.response?.data || err.message);
    }
  }

  // MVP fallback — return wa.me link (opened by doctor or cron log)
  const waLink = `https://wa.me/${cleaned}?text=${encodeURIComponent(body)}`;
  return { success: true, method: 'wame_link', waLink };
};

// ── Bot action functions ────────────────────────────────────────────────

const sendAppointmentReminder = async (clinic, patient, appointment) => {
  const config = await BotConfig.findOne({ clinicId: clinic._id });
  if (!config?.autoAppointmentReminder) return { skipped: 'reminder disabled' };

  const phone = patient.phone;
  if (!phone) return { skipped: 'no phone' };

  const body = config.tplAppointment
    ? config.tplAppointment
        .replace('{patient}', patient.name)
        .replace('{date}', appointment.appointmentDate)
        .replace('{time}', appointment.appointmentTime)
        .replace('{clinic}', clinic.name)
    : TEMPLATES.appointment_reminder(clinic.name, patient.name, appointment.appointmentDate, appointment.appointmentTime, config.locationUrl);

  return sendMessage(phone, body, clinic._id, 'appointment_reminder', {
    patientId: patient._id, patientName: patient.name, refId: appointment._id?.toString(),
  });
};

const sendFollowupReminder = async (clinic, patient, followup) => {
  const config = await BotConfig.findOne({ clinicId: clinic._id });
  if (!config?.autoFollowupReminder) return { skipped: 'followup reminder disabled' };

  const phone = patient.phone;
  if (!phone) return { skipped: 'no phone' };

  const body = config.tplFollowup
    ? config.tplFollowup.replace('{patient}', patient.name).replace('{date}', followup.followupDate).replace('{clinic}', clinic.name)
    : TEMPLATES.followup_reminder(clinic.name, patient.name, followup.followupDate, followup.followupType);

  return sendMessage(phone, body, clinic._id, 'followup_reminder', {
    patientId: patient._id, patientName: patient.name, refId: followup._id?.toString(),
  });
};

const sendReviewRequest = async (clinic, patient, appointment) => {
  const config = await BotConfig.findOne({ clinicId: clinic._id });
  if (!config?.autoReviewRequest || !config.reviewUrl) return { skipped: 'review disabled or no URL' };

  const phone = patient.phone;
  if (!phone) return { skipped: 'no phone' };

  const body = TEMPLATES.review_request(clinic.name, patient.name, config.reviewUrl);
  return sendMessage(phone, body, clinic._id, 'review_request', {
    patientId: patient._id, patientName: patient.name, refId: appointment._id?.toString(),
  });
};

const sendLocationShare = async (clinic, phone, patientName, patientId) => {
  const config = await BotConfig.findOne({ clinicId: clinic._id });
  if (!config?.locationUrl) return { skipped: 'no location URL configured' };

  const body = TEMPLATES.location_share(clinic.name, config.locationUrl, config.locationLabel);
  return sendMessage(phone, body, clinic._id, 'location_share', { patientName, patientId });
};

const sendWelcome = async (clinic, patient) => {
  const config = await BotConfig.findOne({ clinicId: clinic._id });
  if (!config?.autoWelcome) return { skipped: 'welcome disabled' };
  if (!patient.phone) return { skipped: 'no phone' };

  const body = TEMPLATES.welcome(clinic.name, patient.name);
  return sendMessage(patient.phone, body, clinic._id, 'welcome', {
    patientId: patient._id, patientName: patient.name,
  });
};

const sendPaymentReminder = async (clinic, patient, invoice) => {
  const config = await BotConfig.findOne({ clinicId: clinic._id });
  if (!config?.autoPaymentReminder) return { skipped: 'payment reminder disabled' };
  if (!patient.phone) return { skipped: 'no phone' };

  const body = TEMPLATES.payment_reminder(clinic.name, patient.name, invoice.total, invoice.invoiceNumber);
  return sendMessage(patient.phone, body, clinic._id, 'payment_reminder', {
    patientId: patient._id, patientName: patient.name, refId: invoice._id?.toString(),
  });
};

// Handle inbound message from patient (keyword routing)
const handleInbound = async (clinicId, phone, body) => {
  const text = (body || '').trim().toUpperCase();

  // Log inbound
  await BotMessage.create({
    clinicId, phone, direction: 'inbound', messageType: 'inbound_reply', body, status: 'received',
  });

  // Auto-reply to LOCATION keyword
  if (text === 'LOCATION' || text === 'LOC') {
    const clinic  = await Clinic.findById(clinicId);
    const config  = await BotConfig.findOne({ clinicId });
    if (config?.locationUrl && clinic) {
      return sendLocationShare(clinic, phone, 'Patient', null);
    }
  }
  return { handled: true, keyword: text };
};

module.exports = {
  sendMessage,
  sendAppointmentReminder,
  sendFollowupReminder,
  sendReviewRequest,
  sendLocationShare,
  sendWelcome,
  sendPaymentReminder,
  handleInbound,
  TEMPLATES,
  formatPhone,
};
