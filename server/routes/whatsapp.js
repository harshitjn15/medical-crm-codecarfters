const express = require('express');
const router = express.Router();
const { WhatsappLog } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(verifyToken, resolveTenant);

router.get('/logs', async (req, res) => {
  try {
    const { page = 1, limit = 30, type } = req.query;
    const q = { clinicId: req.clinicId };
    if (type) q.messageType = type;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [docs, total] = await Promise.all([
      WhatsappLog.find(q).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      WhatsappLog.countDocuments(q),
    ]);
    res.json({ logs: docs.map(d => d.toJSON()), total });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/log', async (req, res) => {
  try {
    const { patient_name, patient_phone, message_type, message_body } = req.body;
    if (!patient_phone || !message_type) return res.status(400).json({ error: 'phone and type required' });
    const log = await WhatsappLog.create({ clinicId: req.clinicId, patientName: patient_name, patientPhone: patient_phone, messageType: message_type, messageBody: message_body });
    res.status(201).json({ message: 'Logged', id: log.id });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
