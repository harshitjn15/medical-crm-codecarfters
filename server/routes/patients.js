const express = require('express');
const router = express.Router();
const { Patient } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(verifyToken, resolveTenant);

router.get('/', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const q = { clinicId: req.clinicId };
    if (search) {
      const re = new RegExp(search, 'i');
      q.$or = [{ name: re }, { phone: re }, { email: re }];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [docs, total] = await Promise.all([
      Patient.find(q).sort({ name: 1 }).skip(skip).limit(parseInt(limit)),
      Patient.countDocuments(q),
    ]);
    res.json({ patients: docs.map(d => d.toJSON()), total });
  } catch (err) { console.error('[patients]', err.message); res.status(500).json({ error: err.message || 'Failed' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const p = await Patient.findOne({ _id: req.params.id, clinicId: req.clinicId });
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p.toJSON());
  } catch (err) { console.error('[patients]', err.message); res.status(500).json({ error: err.message || 'Failed' }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, phone, email, dateOfBirth, gender, address, bloodGroup, allergies, medicalHistory } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const p = await Patient.create({ clinicId: req.clinicId, name, phone, email, dateOfBirth, gender, address, bloodGroup, allergies, medicalHistory });
    res.status(201).json({ message: 'Patient created', id: p.id });
  } catch (err) { console.error('[patients]', err.message); res.status(500).json({ error: err.message || 'Failed' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, phone, email, dateOfBirth, gender, address, bloodGroup, allergies, medicalHistory } = req.body;
    const p = await Patient.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.clinicId },
      { $set: { name, phone, email, dateOfBirth, gender, address, bloodGroup, allergies, medicalHistory } },
      { new: true }
    );
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Updated', id: p.id });
  } catch (err) { console.error('[patients]', err.message); res.status(500).json({ error: err.message || 'Failed' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await Patient.findOneAndDelete({ _id: req.params.id, clinicId: req.clinicId });
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { console.error('[patients]', err.message); res.status(500).json({ error: err.message || 'Failed' }); }
});

module.exports = router;
