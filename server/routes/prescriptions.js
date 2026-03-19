const express = require('express');
const router = express.Router();
const { Prescription } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(verifyToken, resolveTenant);

router.get('/', async (req, res) => {
  try {
    const { patient_id, page = 1, limit = 20 } = req.query;
    const q = { clinicId: req.clinicId };
    if (patient_id) q.patientId = patient_id;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [docs, total] = await Promise.all([
      Prescription.find(q).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).populate('patientId', 'name phone'),
      Prescription.countDocuments(q),
    ]);
    const prescriptions = docs.map(rx => ({
      ...rx.toJSON(),
      patient_name:  rx.patientId?.name,
      patient_phone: rx.patientId?.phone,
      patient_id:    rx.patientId?.id || rx.patientId,
    }));
    res.json({ prescriptions, total });
  } catch (err) { console.error('[prescriptions]', err.message); res.status(500).json({ error: err.message || 'Failed' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const rx = await Prescription.findOne({ _id: req.params.id, clinicId: req.clinicId }).populate('patientId', 'name phone allergies');
    if (!rx) return res.status(404).json({ error: 'Not found' });
    res.json({
      ...rx.toJSON(),
      patient_name:  rx.patientId?.name,
      patient_phone: rx.patientId?.phone,
      allergies:     rx.patientId?.allergies,
      patient_id:    rx.patientId?.id || rx.patientId,
    });
  } catch (err) { console.error('[prescriptions]', err.message); res.status(500).json({ error: err.message || 'Failed' }); }
});

router.post('/', async (req, res) => {
  try {
    const { patient_id, diagnosis, medications, instructions, notes } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'Patient required' });
    // Filter out empty medication rows (where name is blank)
    const cleanMeds = (medications || []).filter(m => m && m.name && m.name.trim());
    const rx = await Prescription.create({
      clinicId: req.clinicId, patientId: patient_id,
      diagnosis: diagnosis || '', medications: cleanMeds,
      instructions: instructions || '', notes: notes || '',
    });
    res.status(201).json({ message: 'Created', id: rx.id });
  } catch (err) { console.error('[prescriptions]', err.message); res.status(500).json({ error: err.message || 'Failed' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { diagnosis, medications, instructions, notes } = req.body;
    const cleanMeds = (medications || []).filter(m => m && m.name && m.name.trim());
    const rx = await Prescription.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.clinicId },
      { $set: {
          diagnosis:    diagnosis    || '',
          medications:  cleanMeds,
          instructions: instructions || '',
          notes:        notes        || '',
      }},
      { new: true }
    );
    if (!rx) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Updated', id: rx.id });
  } catch (err) {
    console.error('[prescriptions PUT]', err.message);
    res.status(500).json({ error: err.message || 'Failed' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await Prescription.findOneAndDelete({ _id: req.params.id, clinicId: req.clinicId });
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { console.error('[prescriptions]', err.message); res.status(500).json({ error: err.message || 'Failed' }); }
});

module.exports = router;
