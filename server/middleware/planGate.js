const { Subscription } = require('../models/index');
const { PLAN_FEATURES } = require('../models/index');

// ✅ Pricing (yearly as per your model)
const PLAN_PRICES = {
  basic: 9999,
  pro: 16999,
  enterprise: 24999,
};

// ✅ Normalize plan
const normalizePlan = (plan) => {
  if (!plan) return 'basic';
  const p = String(plan).toLowerCase();
  if (['basic', 'pro', 'enterprise'].includes(p)) return p;
  return 'basic';
};

// ✅ Resolve effective plan (trial + expiry logic)
const getEffectivePlan = (sub) => {
  if (!sub) return 'basic';

  const now = new Date();

  // Trial logic
  if (sub.status === 'trial') {
    const trialEnd = new Date(sub.startDate);
    trialEnd.setDate(trialEnd.getDate() + (sub.trialDays || 14));

    if (now <= trialEnd) return sub.plan || 'basic';
    return 'basic';
  }

  // Active subscription
  if (sub.status === 'active') {
    if (!sub.endDate) return sub.plan;

    if (now <= new Date(sub.endDate)) {
      return sub.plan;
    }
    return 'basic';
  }

  // Expired / cancelled
  return 'basic';
};

/**
 * requirePlan(feature)
 */
const requirePlan = (feature) => async (req, res, next) => {
  try {
    const sub = await Subscription.findOne({ clinicId: req.clinicId });

    const rawPlan = getEffectivePlan(sub);
    const plan = normalizePlan(rawPlan);

    const features = PLAN_FEATURES[plan] || PLAN_FEATURES.basic;

    if (!Boolean(features?.[feature])) {
      return res.status(403).json({
        error: 'Feature not available on your plan',
        feature,
        currentPlan: plan,
        upgradeRequired: plan === 'basic' ? 'pro' : 'enterprise',
        plans: PLAN_PRICES,
        period: 'year',
      });
    }

    req.planFeatures = features;
    req.currentPlan = plan;
    req.subscription = sub;

    next();
  } catch (err) {
    console.error('[planGate]', err.message);
    res.status(500).json({ error: 'Plan check failed' });
  }
};

/**
 * attachPlan (non-blocking)
 */
const attachPlan = async (req, res, next) => {
  try {
    const sub = await Subscription.findOne({ clinicId: req.clinicId });

    const rawPlan = getEffectivePlan(sub);
    const plan = normalizePlan(rawPlan);

    req.planFeatures = PLAN_FEATURES[plan] || PLAN_FEATURES.basic;
    req.currentPlan = plan;
    req.subscription = sub;

    next();
  } catch (err) {
    req.planFeatures = PLAN_FEATURES.basic;
    req.currentPlan = 'basic';
    next();
  }
};

module.exports = { requirePlan, attachPlan };