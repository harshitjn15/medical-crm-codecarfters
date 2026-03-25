const express  = require('express');
const router   = express.Router();
const { BotConfig, BotMessage, Clinic, Patient, Appointment, Followup, Invoice, Subscription } = require('../models');
const { PLAN_FEATURES } = require('../models/index');
const { verifyToken } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenantMiddleware');
const { requirePlan, attachPlan } = require('../middleware/planGate');
const engine = require('../bot/engine');

// All admin routes need auth + tenant
const auth = [verifyToken, resolveTenant];

// ── GET /api/bot/status ─────────────────────────────────────────────────
// Returns bot config + current plan info
router.get('/status', ...auth, attachPlan, async (req, res) => {
  try {
    const sub    = await Subscription.findOne({ clinicId: req.clinicId });
    const config = await BotConfig.findOne({ clinicId: req.clinicId });
    const stats  = await BotMessage.aggregate([
      { $match: { clinicId: req.clinicId } },
      { $group: { _id: '$messageType', count: { $sum: 1 } } },
    ]);
    const statMap = {};
    stats.forEach(s => { statMap[s._id] = s.count; });

    res.json({
      plan:        req.currentPlan,
      botEnabled:  req.planFeatures.botEnabled,
      planFeatures:req.planFeatures,
      subscription:{
        status:    sub?.status || 'trial',
        endDate:   sub?.endDate,
        plan:      sub?.plan || 'basic',
      },
      config: config ? {
        isConnected:             config.isConnected,
        botNumber:               config.botNumber,
        lastConnected:           config.lastConnected,
        autoAppointmentReminder: config.autoAppointmentReminder,
        reminderHoursBefore:     config.reminderHoursBefore,
        autoFollowupReminder:    config.autoFollowupReminder,
        autoReviewRequest:       config.autoReviewRequest,
        reviewDelayHours:        config.reviewDelayHours,
        autoLocationShare:       config.autoLocationShare,
        autoWelcome:             config.autoWelcome,
        autoPaymentReminder:     config.autoPaymentReminder,
        locationUrl:             config.locationUrl,
        locationLabel:           config.locationLabel,
        reviewUrl:               config.reviewUrl,
        tplAppointment:          config.tplAppointment,
        tplFollowup:             config.tplFollowup,
        tplReview:               config.tplReview,
        tplLocation:             config.tplLocation,
      } : null,
      stats: statMap,
      totalSent: Object.values(statMap).reduce((a, b) => a + b, 0),
    });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch bot status' }); }
});

// ── PUT /api/bot/config ─────────────────────────────────────────────────
router.put('/config', ...auth, requirePlan('botEnabled'), async (req, res) => {
  try {
    const {
      botNumber, autoAppointmentReminder, reminderHoursBefore,
      autoFollowupReminder, autoReviewRequest, reviewDelayHours,
      autoLocationShare, autoWelcome, autoPaymentReminder,
      locationUrl, locationLabel, reviewUrl,
      tplAppointment, tplFollowup, tplReview, tplLocation,
    } = req.body;

    const config = await BotConfig.findOneAndUpdate(
      { clinicId: req.clinicId },
      { $set: {
          botNumber, autoAppointmentReminder, reminderHoursBefore,
          autoFollowupReminder, autoReviewRequest, reviewDelayHours,
          autoLocationShare, autoWelcome, autoPaymentReminder,
          locationUrl, locationLabel, reviewUrl,
          tplAppointment, tplFollowup, tplReview, tplLocation,
      }},
      { upsert: true, new: true }
    );
    res.json({ message: 'Bot config saved', id: config.id });
  } catch (err) { res.status(500).json({ error: 'Failed to save bot config' }); }
});

// ── GET /api/bot/messages ───────────────────────────────────────────────
router.get('/messages', ...auth, requirePlan('botEnabled'), async (req, res) => {
  try {
    const { page = 1, limit = 30, direction, type } = req.query;
    const q = { clinicId: req.clinicId };
    if (direction) q.direction = direction;
    if (type) q.messageType = type;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [docs, total] = await Promise.all([
      BotMessage.find(q).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      BotMessage.countDocuments(q),
    ]);
    res.json({ messages: docs.map(d => d.toJSON()), total });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch messages' }); }
});

// ── GET /api/bot/inbox (inbound replies from patients) ──────────────────
router.get('/inbox', ...auth, requirePlan('botEnabled'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [docs, total] = await Promise.all([
      BotMessage.find({ clinicId: req.clinicId, direction: 'inbound' }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      BotMessage.countDocuments({ clinicId: req.clinicId, direction: 'inbound' }),
    ]);
    res.json({ messages: docs.map(d => d.toJSON()), total });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch inbox' }); }
});

// ── POST /api/bot/send — manual send from dashboard ────────────────────
router.post('/send', ...auth, requirePlan('botEnabled'), async (req, res) => {
  try {
    const { phone, body, patient_id, patient_name, message_type = 'manual' } = req.body;
    if (!phone || !body) return res.status(400).json({ error: 'phone and body required' });

    const clinic = await Clinic.findById(req.clinicId);
    const result = await engine.sendMessage(phone, body, req.clinicId, message_type, {
      patientId: patient_id, patientName: patient_name,
    });

    res.json({ message: 'Sent', ...result });
  } catch (err) { res.status(500).json({ error: 'Failed to send message' }); }
});

// ── POST /api/bot/send-location ─────────────────────────────────────────
router.post('/send-location', ...auth, requirePlan('botEnabled'), async (req, res) => {
  try {
    const { phone, patient_name, patient_id } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone required' });
    const clinic = await Clinic.findById(req.clinicId);
    const result = await engine.sendLocationShare(clinic, phone, patient_name, patient_id);
    res.json(result);
  } catch (err) { res.status(500).json({ error: 'Failed to send location' }); }
});

// ── POST /api/bot/send-review ───────────────────────────────────────────
router.post('/send-review', ...auth, requirePlan('botEnabled'), async (req, res) => {
  try {
    const { phone, patient_name, patient_id, appointment_id } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone required' });
    const clinic  = await Clinic.findById(req.clinicId);
    const patient = { _id: patient_id, name: patient_name, phone };
    const appt    = { _id: appointment_id };
    const result  = await engine.sendReviewRequest(clinic, patient, appt);
    res.json(result);
  } catch (err) { res.status(500).json({ error: 'Failed to send review request' }); }
});

// ── POST /api/bot/webhook — receive inbound from WhatsApp Cloud API ──────
// Set this URL in Meta webhook: POST /api/bot/webhook
router.post('/webhook', async (req, res) => {
  try {
    res.sendStatus(200); // respond immediately to WhatsApp

    const entry   = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value   = changes?.value;
    if (!value?.messages?.length) return;

    const msg   = value.messages[0];
    const phone = msg.from;
    const body  = msg.text?.body || '';

    // Find which clinic this phone belongs to (via BotConfig botNumber)
    const phoneId  = value.metadata?.phone_number_id;
    const config   = await BotConfig.findOne({ sessionId: phoneId });
    if (!config) return;

    await engine.handleInbound(config.clinicId, phone, body);
  } catch (err) {
    console.error('[webhook] error:', err.message);
  }
});

// Webhook verification (Meta requires GET with challenge)
router.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && process.env.WEBHOOK_VERIFY_TOKEN && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ── Plan info endpoint (no auth — used on pricing page) ─────────────────
router.get('/plans', (req, res) => {
  res.json({
    plans: [
      {
        _id: 'basic',
        name: 'Basic',
        price: 9999,
        period: 'year',
        tagline: 'Perfect to get started',
        features: PLAN_FEATURES.basic,
        highlights: [
          'Patients, appointments & billing',
          'Prescriptions & follow-ups',
          'Manual WhatsApp buttons',
          'Clinical notes & vital signs',
          'Treatment plans',
          '1 admin + 2 staff',
          'Up to 500 patients',
        ],
        notIncluded: ['WhatsApp Bot automation','Review collection','Location bot','Public website','Custom invoice template','Multi-location'],
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 16999,
        period: 'year',
        popular: true,
        tagline: 'For growing clinics',
        features: PLAN_FEATURES.pro,
        highlights: [
          'Everything in Basic',
          'WhatsApp Bot — dedicated number',
          'Auto appointment reminders',
          'Auto follow-up reminders',
          'Review collection bot',
          'Location sharing (bot replies with Maps)',
          'Public website + booking page',
          'Custom invoice template & logo',
          '1 admin + 5 staff',
          'Up to 5,000 patients',
        ],
        notIncluded: ['Multi-location branches','Priority support'],
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 24999,
        period: 'year',
        tagline: 'For clinic chains & hospitals',
        features: PLAN_FEATURES.enterprise,
        highlights: [
          'Everything in Pro',
          'Unlimited locations (branches)',
          'Separate bot per location',
          'Unlimited staff & patients',
          'Priority WhatsApp support',
          'Custom domain for website',
          'White-label option',
          'Dedicated onboarding call',
          'API access',
          'Super admin analytics',
        ],
        notIncluded: [],
      },
    ],
  });
});

module.exports = router;
