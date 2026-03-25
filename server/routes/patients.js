const express = require('express');
const router = express.Router();
const { Patient } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenantMiddleware');
const { requireRole } = require('../middleware/requireRole');

router.use(verifyToken, resolveTenant);

router.get('/', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const q = { clinicId: req.clinicId };
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'i');
      q.$or = [{ name: re }, { phone: re }, { email: re }];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [docs, total] = await Promise.all([
      Patient.find(q).sort({ name: 1 }).skip(skip).limit(parseInt(limit)),
      Patient.countDocuments(q),
    ]);
    res.json({ patients: docs.map(d => d.toJSON()), total });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch patients' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const p = await Patient.findOne({ _id: req.params.id, clinicId: req.clinicId });
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p.toJSON());
  } catch (err) { res.status(500).json({ error: 'Failed to fetch patient' }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, phone, email, dateOfBirth, gender, address, bloodGroup, allergies, medicalHistory } = req.body;
    // Handle snake_case UI fallback
    const dob = dateOfBirth || req.body.date_of_birth;
    const bg = bloodGroup || req.body.blood_group;
    const mh = medicalHistory || req.body.medical_history;

    if (!name) return res.status(400).json({ error: 'Name required' });

    if (phone) {
      const dup = await Patient.findOne({ clinicId: req.clinicId, phone });
      if (dup) return res.status(400).json({ error: 'Patient already exists with this mobile number' });
    }
    if (email) {
      const dup = await Patient.findOne({ clinicId: req.clinicId, email });
      if (dup) return res.status(400).json({ error: 'Patient already exists with this email' });
    }

    const p = await Patient.create({ clinicId: req.clinicId, name, phone, email, dateOfBirth: dob, gender, address, bloodGroup: bg, allergies, medicalHistory: mh });
    res.status(201).json({ message: 'Patient created', id: p.id });
  } catch (err) { res.status(500).json({ error: 'Failed to create patient' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, phone, email, dateOfBirth, gender, address, bloodGroup, allergies, medicalHistory } = req.body;
    const dob = dateOfBirth || req.body.date_of_birth;
    const bg = bloodGroup || req.body.blood_group;
    const mh = medicalHistory || req.body.medical_history;

    if (phone) {
      const dup = await Patient.findOne({ clinicId: req.clinicId, phone, _id: { $ne: req.params.id } });
      if (dup) return res.status(400).json({ error: 'Patient already exists with this mobile number' });
    }
    if (email) {
      const dup = await Patient.findOne({ clinicId: req.clinicId, email, _id: { $ne: req.params.id } });
      if (dup) return res.status(400).json({ error: 'Patient already exists with this email' });
    }

    const p = await Patient.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.clinicId },
      { $set: { name, phone, email, dateOfBirth: dob, gender, address, bloodGroup: bg, allergies, medicalHistory: mh } },
      { new: true }
    );
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Updated', id: p.id });
  } catch (err) { res.status(500).json({ error: 'Failed to update patient' }); }
});

router.delete('/:id', requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const r = await Patient.findOneAndDelete({ _id: req.params.id, clinicId: req.clinicId });
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete patient' }); }
});

module.exports = router;
