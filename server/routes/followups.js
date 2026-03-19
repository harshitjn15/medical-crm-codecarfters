const express = require('express');
const router = express.Router();
const { Followup } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(verifyToken, resolveTenant);

router.get('/', async (req, res) => {
  try {
    const { status, patient_id, page = 1, limit = 20 } = req.query;
    const q = { clinicId: req.clinicId };
    if (status && status !== 'all') q.status = status;
    if (patient_id) q.patientId = patient_id;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [docs, total] = await Promise.all([
      Followup.find(q).sort({ followupDate: 1 }).skip(skip).limit(parseInt(limit)).populate('patientId', 'name phone'),
      Followup.countDocuments(q),
    ]);
    const followups = docs.map(f => ({
      ...f.toJSON(),
      patient_name:  f.patientId?.name,
      patient_phone: f.patientId?.phone,
      followup_date: f.followupDate,
      followup_type: f.followupType,
    }));
    res.json({ followups, total });
  } catch (err) { console.error('[followups]', err.message); res.status(500).json({ error: err.message || 'Failed' }); }
});

router.post('/', async (req, res) => {
  try {
    const { patient_id, prescription_id, followup_date, followup_type, notes } = req.body;
    if (!patient_id || !followup_date) return res.status(400).json({ error: 'Patient and date required' });
    const f = await Followup.create({ clinicId: req.clinicId, patientId: patient_id, prescriptionId: prescription_id || undefined, followupDate: followup_date, followupType: followup_type || 'checkup', notes });
    res.status(201).json({ message: 'Created', id: f.id });
  } catch (err) { console.error('[followups]', err.message); res.status(500).json({ error: err.message || 'Failed' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { status, notes, followup_date } = req.body;
    const update = {};
    if (status) update.status = status;
    if (notes !== undefined) update.notes = notes;
    if (followup_date) update.followupDate = followup_date;
    const f = await Followup.findOneAndUpdate({ _id: req.params.id, clinicId: req.clinicId }, { $set: update }, { new: true });
    if (!f) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Updated', id: f.id });
  } catch (err) { console.error('[followups]', err.message); res.status(500).json({ error: err.message || 'Failed' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await Followup.findOneAndDelete({ _id: req.params.id, clinicId: req.clinicId });
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { console.error('[followups]', err.message); res.status(500).json({ error: err.message || 'Failed' }); }
});

module.exports = router;
