const express = require('express');
const router = express.Router();
const { Clinic } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.get('/me', verifyToken, resolveTenant, (req, res) => res.json(req.clinic));

router.put('/me', verifyToken, resolveTenant, async (req, res) => {
  try {
    const { name, address, phone, email, tagline, gstNumber, currency, specialty } = req.body;
    const c = await Clinic.findByIdAndUpdate(req.clinicId, { $set: { name, address, phone, email, tagline, gstNumber, currency, specialty } }, { new: true });
    res.json({ message: 'Updated', id: c.id });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
