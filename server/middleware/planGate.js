const { Subscription } = require('../models');
const { PLAN_FEATURES } = require('../models/index');

/**
 * requirePlan(feature)
 * Middleware that checks if clinic's active plan includes the feature.
 * Usage: router.get('/bot/status', verifyToken, resolveTenant, requirePlan('botEnabled'), handler)
 */
const requirePlan = (feature) => async (req, res, next) => {
  try {
    const sub = await Subscription.findOne({ clinicId: req.clinicId });
    const plan = sub?.plan || req.clinic?.plan || 'basic';
    const features = PLAN_FEATURES[plan] || PLAN_FEATURES.basic;

    if (!features[feature]) {
      return res.status(403).json({
        error: 'Feature not available on your plan',
        feature,
        currentPlan: plan,
        upgradeRequired: plan === 'basic' ? 'pro' : 'enterprise',
        plans: { basic: 9999, pro: 16999, enterprise: 24999 },
      });
    }
    req.planFeatures = features;
    req.currentPlan  = plan;
    next();
  } catch (err) {
    console.error('[planGate]', err.message);
    res.status(500).json({ error: 'Plan check failed' });
  }
};

/**
 * attachPlan — attaches planFeatures to req without blocking.
 * Useful for routes that need to know the plan but still serve all users.
 */
const attachPlan = async (req, res, next) => {
  try {
    const sub = await Subscription.findOne({ clinicId: req.clinicId });
    const plan = sub?.plan || req.clinic?.plan || 'basic';
    req.planFeatures = PLAN_FEATURES[plan] || PLAN_FEATURES.basic;
    req.currentPlan  = plan;
    req.subscription = sub;
    next();
  } catch (err) {
    req.planFeatures = PLAN_FEATURES.basic;
    req.currentPlan  = 'basic';
    next();
  }
};

module.exports = { requirePlan, attachPlan };
