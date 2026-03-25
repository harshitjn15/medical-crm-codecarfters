'use strict';
/**
 * bot/engine.js — CodeCrafters Health WhatsApp Automation Engine
 *
 * Centralized messaging platform for multi-clinic CRM.
 * Sends on behalf of each clinic using a single company-owned Meta Cloud API number.
 *
 * Modes:
 *   1. Meta WhatsApp Cloud API — WHATSAPP_TOKEN + WHATSAPP_PHONE_ID set in .env
 *   2. wa.me fallback          — manual link if Cloud API not configured
 */

const axios = require('axios');
const { BotConfig, BotMessage, Clinic } = require('../models');

const PLATFORM_NAME = 'CodeCrafters Health';

// ── Phone formatter ────────────────────────────────────────────────────
const formatPhone = (phone, cc = '91') => {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.length === 10) return cc + d;
  if (d.length > 10) return d;
  return null;
};

// ── Brand footer ────────────────────────────────────────────────────────
// Every outbound message ends with clinic identity + platform credit
const brandedFooter = (clinicName) =>
  `\n\n— _Powered by ${PLATFORM_NAME}_`;

// ── Message Templates (< 100 words each) ──────────────────────────────
const TEMPLATES = {
  appointment_reminder: (clinic, patient, date, time, loc) =>
    `Hi ${patient} 👋\n\n` +
    `🏥 *${clinic}*\n\n` +
    `This is a friendly reminder for your appointment:\n` +
    `📅 *Date:* ${date}\n` +
    `⏰ *Time:* ${time}\n` +
    (loc ? `📍 *Location:* ${loc}\n` : '') +
    `\nReply *YES* to confirm or *NO* to cancel.` +
    brandedFooter(clinic),

  followup_reminder: (clinic, patient, date, type) =>
    `Hi ${patient} 😊\n\n` +
    `🏥 *${clinic}*\n\n` +
    `Hope you're feeling better! Your *${type || 'follow-up'}* checkup is due on *${date}*.\n\n` +
    `Please call us or reply to schedule a convenient time.` +
    brandedFooter(clinic),

  review_request: (clinic, patient, url) =>
    `Hi ${patient} 🌟\n\n` +
    `🏥 *${clinic}*\n\n` +
    `Thank you for visiting us! We'd love your feedback.\n\n` +
    `⭐ Rate your experience: ${url}\n\n` +
    `Your review helps us serve you better!` +
    brandedFooter(clinic),

  location_share: (clinic, url, label) =>
    `📍 *${clinic} — Location*\n\n` +
    `${label || "Here's how to find us:"}\n${url}` +
    brandedFooter(clinic),

  welcome: (clinic, patient) =>
    `Hi ${patient}! 👋\n\n` +
    `🏥 *${clinic}*\n\n` +
    `Welcome! We're glad to have you with us.\n\n` +
    `Reply *LOCATION* for our address, or call us to book an appointment.` +
    brandedFooter(clinic),

  payment_reminder: (clinic, patient, amount, inv) =>
    `Hi ${patient} 🙏\n\n` +
    `🏥 *${clinic}*\n\n` +
    `This is a gentle reminder for an outstanding balance:\n` +
    `💰 Amount Due: *₹${amount}*\n` +
    `🧾 Invoice: *${inv}*\n\n` +
    `Please contact us if you have any questions.` +
    brandedFooter(clinic),

  // ── Intent-based auto-replies ──────────────────────────────────────
  reply_confirm: (clinic) =>
    `✅ Thank you for confirming! We look forward to seeing you.\n\n🏥 *${clinic}*` + brandedFooter(clinic),

  reply_cancel: (clinic) =>
    `We've noted your cancellation. Please call us to reschedule at your convenience.\n\n🏥 *${clinic}*` + brandedFooter(clinic),

  reply_reschedule: (clinic) =>
    `We'd be happy to reschedule! Our team will contact you shortly to find a suitable time.\n\n🏥 *${clinic}*` + brandedFooter(clinic),

  reply_inquiry: (clinic) =>
    `Thank you for reaching out to *${clinic}*! Our team will get back to you shortly.` + brandedFooter(clinic),

  reply_failsafe: (clinic) =>
    `Thank you for your message. Our team at *${clinic}* will contact you shortly to assist you.` + brandedFooter(clinic),
};

// ── Cloud API ──────────────────────────────────────────────────────────
const sendViaCloudAPI = async (phone, body) => {
  const r = await axios.post(
    `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
    { messaging_product: 'whatsapp', to: phone, type: 'text', text: { body, preview_url: false } },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }
  );
  return { success: true, method: 'cloud_api', msgId: r.data?.messages?.[0]?.id };
};

// ── Duplicate guard ────────────────────────────────────────────────────
// Prevents sending the same message type to the same patient within a time window
const isDuplicate = async (clinicId, phone, messageType, windowHours = 20) => {
  const since = new Date(Date.now() - windowHours * 3600000);
  const existing = await BotMessage.findOne({
    clinicId, phone, messageType, direction: 'outbound', createdAt: { $gte: since },
  });
  return !!existing;
};

// ── Master send ────────────────────────────────────────────────────────
const sendMessage = async (phone, body, clinicId, messageType, extra = {}) => {
  const cleaned = formatPhone(phone);
  if (!cleaned) return { skipped: true, reason: 'invalid_phone' };

  // Cost optimization: skip duplicates for automated types
  const autoTypes = ['appointment_reminder', 'followup_reminder', 'review_request', 'payment_reminder'];
  if (autoTypes.includes(messageType) && extra.refId) {
    const dup = await isDuplicate(clinicId, cleaned, messageType, 20);
    if (dup) return { skipped: true, reason: 'duplicate_suppressed' };
  }

  // Log to DB
  const msgDoc = await BotMessage.create({
    clinicId, phone: cleaned,
    patientId: extra.patientId, patientName: extra.patientName,
    direction: 'outbound', messageType, body,
    refId: extra.refId, status: 'sent',
  }).catch(() => null);

  const updateStatus = async (status, err) => {
    if (msgDoc)
      await BotMessage.findByIdAndUpdate(msgDoc._id, { $set: { status, ...(err ? { errorMsg: err } : {}) } });
  };

  try {
    if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) {
      const r = await sendViaCloudAPI(cleaned, body);
      await updateStatus('delivered');
      return r;
    }
    // Fallback: wa.me link
    return {
      success: true, method: 'wame_link',
      waLink: `https://wa.me/${cleaned}?text=${encodeURIComponent(body)}`,
    };
  } catch (err) {
    await updateStatus('failed', err.message);
    console.error(`[bot] Send failed → ${phone}:`, err.message);
    return { success: false, error: err.message };
  }
};

// ── Action helpers ─────────────────────────────────────────────────────
const sendAppointmentReminder = async (clinic, patient, appt) => {
  const cfg = await BotConfig.findOne({ clinicId: clinic._id }).lean();
  if (!cfg?.autoAppointmentReminder) return { skipped: 'disabled' };
  if (!patient.phone) return { skipped: 'no phone' };
  const body = cfg.tplAppointment
    ? cfg.tplAppointment
        .replace('{patient}', patient.name).replace('{date}', appt.appointmentDate)
        .replace('{time}', appt.appointmentTime).replace('{clinic}', clinic.name)
    : TEMPLATES.appointment_reminder(clinic.name, patient.name, appt.appointmentDate, appt.appointmentTime, cfg.locationUrl);
  return sendMessage(patient.phone, body, clinic._id, 'appointment_reminder', {
    patientId: patient._id, patientName: patient.name, refId: appt._id?.toString(),
  });
};

const sendFollowupReminder = async (clinic, patient, fu) => {
  const cfg = await BotConfig.findOne({ clinicId: clinic._id }).lean();
  if (!cfg?.autoFollowupReminder) return { skipped: 'disabled' };
  if (!patient.phone) return { skipped: 'no phone' };
  const body = cfg.tplFollowup
    ? cfg.tplFollowup.replace('{patient}', patient.name).replace('{date}', fu.followupDate).replace('{clinic}', clinic.name)
    : TEMPLATES.followup_reminder(clinic.name, patient.name, fu.followupDate, fu.followupType);
  return sendMessage(patient.phone, body, clinic._id, 'followup_reminder', {
    patientId: patient._id, patientName: patient.name, refId: fu._id?.toString(),
  });
};

const sendReviewRequest = async (clinic, patient, appt) => {
  const cfg = await BotConfig.findOne({ clinicId: clinic._id }).lean();
  if (!cfg?.autoReviewRequest || !cfg.reviewUrl) return { skipped: 'disabled or no URL' };
  if (!patient.phone) return { skipped: 'no phone' };
  const body = TEMPLATES.review_request(clinic.name, patient.name, cfg.reviewUrl);
  return sendMessage(patient.phone, body, clinic._id, 'review_request', {
    patientId: patient._id, patientName: patient.name, refId: appt._id?.toString(),
  });
};

const sendLocationShare = async (clinic, phone, patientName, patientId) => {
  const cfg = await BotConfig.findOne({ clinicId: clinic._id }).lean();
  if (!cfg?.locationUrl) return { skipped: 'no location URL' };
  const body = TEMPLATES.location_share(clinic.name, cfg.locationUrl, cfg.locationLabel);
  return sendMessage(phone, body, clinic._id, 'location_share', { patientName, patientId });
};

const sendWelcome = async (clinic, patient) => {
  const cfg = await BotConfig.findOne({ clinicId: clinic._id }).lean();
  if (!cfg?.autoWelcome) return { skipped: 'disabled' };
  if (!patient.phone) return { skipped: 'no phone' };
  const body = TEMPLATES.welcome(clinic.name, patient.name);
  return sendMessage(patient.phone, body, clinic._id, 'welcome', {
    patientId: patient._id, patientName: patient.name,
  });
};

const sendPaymentReminder = async (clinic, patient, invoice) => {
  const cfg = await BotConfig.findOne({ clinicId: clinic._id }).lean();
  if (!cfg?.autoPaymentReminder) return { skipped: 'disabled' };
  if (!patient.phone) return { skipped: 'no phone' };
  const body = TEMPLATES.payment_reminder(clinic.name, patient.name, invoice.total, invoice.invoiceNumber);
  return sendMessage(patient.phone, body, clinic._id, 'payment_reminder', {
    patientId: patient._id, patientName: patient.name, refId: invoice._id?.toString(),
  });
};

// ── Intent detection ───────────────────────────────────────────────────
/**
 * Classifies inbound message intent from patients.
 * Returns: { intent, confidence }
 * intents: 'confirm' | 'cancel' | 'reschedule' | 'location' | 'inquiry' | 'unknown'
 */
const detectIntent = (text) => {
  const t = text.trim().toUpperCase();

  if (['YES', 'CONFIRM', 'OK', 'OKAY', 'CONFIRMED', 'HAA', 'HA'].some(k => t === k || t.startsWith(k + ' ')))
    return { intent: 'confirm', confidence: 95 };

  if (['NO', 'CANCEL', 'NAHI', 'NAH', 'NOPE', 'CANCEL IT', 'DONT COME'].some(k => t === k || t.includes(k)))
    return { intent: 'cancel', confidence: 90 };

  if (['RESCHEDULE', 'CHANGE DATE', 'CHANGE TIME', 'POSTPONE', 'SHIFT', 'MOVE APPOINTMENT'].some(k => t.includes(k)))
    return { intent: 'reschedule', confidence: 90 };

  if (['LOCATION', 'LOC', 'ADDRESS', 'WHERE', 'DIRECTIONS', 'MAP', 'HOW TO REACH'].some(k => t.includes(k)))
    return { intent: 'location', confidence: 92 };

  if (t.length < 5)
    return { intent: 'unknown', confidence: 20 };

  // General inquiry (booking, hours, fees, etc)
  const inquiryKeywords = ['BOOK', 'APPOINTMENT', 'FEES', 'PRICE', 'COST', 'DOCTOR', 'TIMING', 'OPEN', 'HOURS', 'AVAILABLE'];
  if (inquiryKeywords.some(k => t.includes(k)))
    return { intent: 'inquiry', confidence: 78 };

  return { intent: 'unknown', confidence: 30 };
};

// ── Inbound handler ────────────────────────────────────────────────────
const handleInbound = async (phone, body) => {
  // Step 1: Route to correct clinic
  let targetClinicId = null;
  const recentOutbound = await BotMessage.findOne({ phone, direction: 'outbound' }).sort({ createdAt: -1 });
  if (recentOutbound) targetClinicId = recentOutbound.clinicId;

  if (!targetClinicId) {
    const { Patient } = require('../models');
    const phoneVariants = [phone];
    if (phone.length > 10) phoneVariants.push(phone.slice(-10));
    else if (phone.length === 10) phoneVariants.push('91' + phone);
    const matches = await Patient.find({ phone: { $in: phoneVariants } });
    if (matches.length > 0) targetClinicId = matches[0].clinicId;
  }

  if (!targetClinicId) {
    console.log(`[bot] Inbound from ${phone} unrouted — no clinic match.`);
    return { handled: false, reason: 'unknown_patient' };
  }

  // Step 2: Log inbound
  await BotMessage.create({
    clinicId: targetClinicId, phone,
    direction: 'inbound', messageType: 'inbound_reply', body, status: 'received',
  }).catch(() => {});

  // Step 3: Detect intent
  const { intent, confidence } = detectIntent(body);
  const clinic = await Clinic.findById(targetClinicId);
  if (!clinic) return { handled: false, reason: 'clinic_not_found' };

  console.log(`[bot] Inbound from ${phone} → clinic "${clinic.name}" | intent: ${intent} (${confidence}%)`);

  // Fail-safe: low confidence → hand off to human
  if (confidence < 80) {
    const replyBody = TEMPLATES.reply_failsafe(clinic.name);
    await sendMessage(phone, replyBody, targetClinicId, 'manual', {});
    return { handled: true, intent: 'failsafe', confidence };
  }

  // Step 4: React to intent
  switch (intent) {
    case 'confirm':
      // Mark last appointment reminder as read
      await BotMessage.findOneAndUpdate(
        { clinicId: targetClinicId, phone, messageType: 'appointment_reminder', direction: 'outbound' },
        { $set: { status: 'read' } },
        { sort: { createdAt: -1 } }
      ).catch(() => {});
      await sendMessage(phone, TEMPLATES.reply_confirm(clinic.name), targetClinicId, 'manual', {});
      break;

    case 'cancel':
      await sendMessage(phone, TEMPLATES.reply_cancel(clinic.name), targetClinicId, 'manual', {});
      break;

    case 'reschedule':
      await sendMessage(phone, TEMPLATES.reply_reschedule(clinic.name), targetClinicId, 'manual', {});
      break;

    case 'location':
      await sendLocationShare(clinic, phone, null, null);
      break;

    case 'inquiry':
      await sendMessage(phone, TEMPLATES.reply_inquiry(clinic.name), targetClinicId, 'manual', {});
      break;

    default:
      await sendMessage(phone, TEMPLATES.reply_failsafe(clinic.name), targetClinicId, 'manual', {});
  }

  return { handled: true, intent, confidence };
};

// ── Mode check ──────────────────────────────────────────────────────────
const getBotMode = () => {
  if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) return 'cloud_api';
  return 'manual';
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
  getBotMode,
  detectIntent,
  TEMPLATES,
  formatPhone,
  PLATFORM_NAME,
};
