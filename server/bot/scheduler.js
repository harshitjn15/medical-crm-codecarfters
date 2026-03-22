/**
 * bot/scheduler.js
 * Runs on server startup. Checks for due reminders every 30 minutes.
 */
const cron = require('node-cron');
const { Appointment, Followup, Patient, Clinic, BotConfig, BotMessage, Subscription, Invoice } = require('../models');
const { PLAN_FEATURES } = require('../models/index');
const engine = require('./engine');

let schedulerStarted = false;

const getToday = () => new Date().toISOString().split('T')[0];

const getTomorrowDate = (hoursAhead = 24) => {
  const d = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
};

// ── Helper: check if clinic has bot enabled ─────────────────────────────
const clinicHasBot = async (clinicId) => {
  const sub  = await Subscription.findOne({ clinicId });
  const plan = sub?.plan || 'basic';
  return PLAN_FEATURES[plan]?.botEnabled === true && sub?.status !== 'expired';
};

// ── Job 1: Appointment reminders ────────────────────────────────────────
const runAppointmentReminders = async () => {
  try {
    // Get all bot-enabled clinics
    const configs = await BotConfig.find({ autoAppointmentReminder: true });
    for (const config of configs) {
      if (!(await clinicHasBot(config.clinicId))) continue;

      const hoursAhead = config.reminderHoursBefore || 24;
      const targetDate = getTomorrowDate(hoursAhead);

      // Find scheduled appointments on target date not yet reminded
      const appointments = await Appointment.find({
        clinicId: config.clinicId,
        appointmentDate: targetDate,
        status: 'scheduled',
      });

      for (const appt of appointments) {
        // Skip if already sent a reminder for this appointment today
        const alreadySent = await BotMessage.findOne({
          clinicId: config.clinicId,
          refId: appt._id.toString(),
          messageType: 'appointment_reminder',
          createdAt: { $gte: new Date(Date.now() - 20 * 60 * 60 * 1000) }, // 20h window
        });
        if (alreadySent) continue;

        // Find patient
        const phone = appt.patientPhone || (appt.patientId ? (await Patient.findById(appt.patientId))?.phone : null);
        if (!phone) continue;

        const patient = { _id: appt.patientId, name: appt.patientName, phone };
        const clinic  = await Clinic.findById(config.clinicId);
        if (!clinic || !clinic.isActive) continue;

        const result = await engine.sendAppointmentReminder(clinic, patient, appt);
        console.log(`[scheduler] Appointment reminder → ${appt.patientName} (${phone}):`, result.method || result.skipped);
      }
    }
  } catch (err) {
    console.error('[scheduler] Appointment reminder error:', err.message);
  }
};

// ── Job 2: Follow-up reminders ──────────────────────────────────────────
const runFollowupReminders = async () => {
  try {
    const today   = getToday();
    const configs = await BotConfig.find({ autoFollowupReminder: true });

    for (const config of configs) {
      if (!(await clinicHasBot(config.clinicId))) continue;

      const followups = await Followup.find({
        clinicId: config.clinicId,
        followupDate: today,
        status: 'pending',
      }).populate('patientId', 'name phone');

      for (const fu of followups) {
        const patient = fu.patientId;
        if (!patient?.phone) continue;

        const alreadySent = await BotMessage.findOne({
          clinicId: config.clinicId,
          refId: fu._id.toString(),
          messageType: 'followup_reminder',
          createdAt: { $gte: new Date(Date.now() - 20 * 60 * 60 * 1000) },
        });
        if (alreadySent) continue;

        const clinic = await Clinic.findById(config.clinicId);
        if (!clinic) continue;

        const result = await engine.sendFollowupReminder(clinic, patient, fu);
        console.log(`[scheduler] Followup reminder → ${patient.name}:`, result.method || result.skipped);
      }
    }
  } catch (err) {
    console.error('[scheduler] Followup reminder error:', err.message);
  }
};

// ── Job 3: Review requests (2h after appointment completed) ─────────────
const runReviewRequests = async () => {
  try {
    const configs = await BotConfig.find({ autoReviewRequest: true, reviewUrl: { $exists: true, $ne: '' } });

    for (const config of configs) {
      if (!(await clinicHasBot(config.clinicId))) continue;

      const delayHours  = config.reviewDelayHours || 2;
      const windowStart = new Date(Date.now() - (delayHours + 1) * 60 * 60 * 1000);
      const windowEnd   = new Date(Date.now() - delayHours * 60 * 60 * 1000);

      const appointments = await Appointment.find({
        clinicId: config.clinicId,
        status: 'completed',
        updatedAt: { $gte: windowStart, $lte: windowEnd },
      });

      for (const appt of appointments) {
        const alreadySent = await BotMessage.findOne({
          clinicId: config.clinicId,
          refId: appt._id.toString(),
          messageType: 'review_request',
        });
        if (alreadySent) continue;

        const phone = appt.patientPhone || (appt.patientId ? (await Patient.findById(appt.patientId))?.phone : null);
        if (!phone) continue;

        const patient = { _id: appt.patientId, name: appt.patientName, phone };
        const clinic  = await Clinic.findById(config.clinicId);
        if (!clinic) continue;

        const result = await engine.sendReviewRequest(clinic, patient, appt);
        console.log(`[scheduler] Review request → ${appt.patientName}:`, result.method || result.skipped);
      }
    }
  } catch (err) {
    console.error('[scheduler] Review request error:', err.message);
  }
};

// ── Job 4: Payment reminders (unpaid invoices > 7 days) ─────────────────
const runPaymentReminders = async () => {
  try {
    const configs = await BotConfig.find({ autoPaymentReminder: true });

    for (const config of configs) {
      if (!(await clinicHasBot(config.clinicId))) continue;

      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const invoices = await Invoice.find({
        clinicId: config.clinicId,
        status: { $in: ['sent', 'draft'] },
        createdAt: { $lte: cutoff },
      }).populate('patientId', 'name phone');

      for (const inv of invoices) {
        const patient = inv.patientId;
        if (!patient?.phone) continue;

        const alreadySentToday = await BotMessage.findOne({
          clinicId: config.clinicId,
          refId: inv._id.toString(),
          messageType: 'payment_reminder',
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        });
        if (alreadySentToday) continue;

        const clinic = await Clinic.findById(config.clinicId);
        if (!clinic) continue;

        const result = await engine.sendPaymentReminder(clinic, patient, inv);
        console.log(`[scheduler] Payment reminder → ${patient.name}:`, result.method || result.skipped);
      }
    }
  } catch (err) {
    console.error('[scheduler] Payment reminder error:', err.message);
  }
};

// ── Start all cron jobs ─────────────────────────────────────────────────
const startScheduler = () => {
  if (schedulerStarted) return;
  schedulerStarted = true;

  // Every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('[scheduler] Running at', new Date().toLocaleTimeString());
    await runAppointmentReminders();
    await runFollowupReminders();
    await runReviewRequests();
    await runPaymentReminders();
  });

  console.log('[scheduler] Started — appointment, followup, review & payment reminders active');
};

module.exports = { startScheduler, runAppointmentReminders, runFollowupReminders, runReviewRequests };
