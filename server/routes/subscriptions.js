const express = require('express');
const router  = express.Router();
const { Subscription, Clinic } = require('../models');
const { verifyToken }   = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenantMiddleware');

// Super admin only
const superOnly = (req, res, next) =>
  req.userRole === 'super_admin' ? next() : res.status(403).json({ error: 'Super admin only' });

const auth = [verifyToken, resolveTenant, superOnly];

// GET /api/subscriptions — list all
router.get('/', ...auth, async (req, res) => {
  try {
    const subs = await Subscription.find().populate('clinicId', 'name slug isActive specialty').sort({ createdAt: -1 });
    res.json(subs.map(s => s.toJSON()));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/subscriptions/:clinicId
router.get('/:clinicId', ...auth, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ clinicId: req.params.clinicId });
    res.json(sub ? sub.toJSON() : { plan: 'basic', status: 'trial' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/subscriptions — create or update subscription for a clinic
router.post('/', ...auth, async (req, res) => {
  try {
    const { clinic_id, plan, status, amount, payment_ref, notes, trial_days } = req.body;
    if (!clinic_id || !plan) return res.status(400).json({ error: 'clinic_id and plan required' });

    const startDate = new Date();
    let endDate;
    if (status === 'active') {
      endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1); // 1 year
    }

    const sub = await Subscription.findOneAndUpdate(
      { clinicId: clinic_id },
      { $set: {
          plan, status: status || 'active', startDate,
          endDate: endDate || undefined,
          amount: amount || { basic: 9999, pro: 16999, enterprise: 24999 }[plan],
          paymentRef: payment_ref, notes,
          trialDays: trial_days || 14,
      }},
      { upsert: true, new: true }
    );

    // Also update plan on Clinic document for quick access
    await Clinic.findByIdAndUpdate(clinic_id, { $set: { plan } });

    res.status(201).json({ message: 'Subscription set', id: sub.id, plan, endDate });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/subscriptions/:id/cancel
router.put('/:id/cancel', ...auth, async (req, res) => {
  try {
    const sub = await Subscription.findByIdAndUpdate(req.params.id, { $set: { status: 'cancelled' } }, { new: true });
    if (!sub) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Cancelled', id: sub.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/subscriptions/me/status — clinic gets their own plan
router.get('/me/status', verifyToken, resolveTenant, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ clinicId: req.clinicId });
    const { PLAN_FEATURES } = require('../models/index');
    const plan = sub?.plan || req.clinic?.plan || 'basic';
    res.json({
      plan,
      status:      sub?.status || 'trial',
      endDate:     sub?.endDate,
      features:    PLAN_FEATURES[plan] || PLAN_FEATURES.basic,
      prices:      { basic: 9999, pro: 16999, enterprise: 24999 },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
