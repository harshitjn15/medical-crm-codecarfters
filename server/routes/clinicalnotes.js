const express = require('express');
const router = express.Router();
const { ClinicalNote } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(verifyToken, resolveTenant);

router.get('/', async (req, res) => {
  try {
    const { patient_id, page = 1, limit = 20 } = req.query;
    const q = { clinicId: req.clinicId };
    if (patient_id) q.patientId = patient_id;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [docs, total] = await Promise.all([
      ClinicalNote.find(q).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).populate('patientId', 'name'),
      ClinicalNote.countDocuments(q),
    ]);
    res.json({ notes: docs.map(d => ({ ...d.toJSON(), patient_name: d.patientId?.name })), total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { patient_id, appointment_id, note_date, chief_complaint, subjective, objective, assessment, plan, doctor_name, specialty, tags } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'Patient required' });
    const n = await ClinicalNote.create({
      clinicId: req.clinicId, patientId: patient_id,
      appointmentId: appointment_id || undefined,
      noteDate: note_date || new Date().toISOString().split('T')[0],
      chiefComplaint: chief_complaint, subjective, objective, assessment, plan,
      doctorName: doctor_name, specialty, tags: tags || [],
    });
    res.status(201).json({ message: 'Created', id: n.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { chief_complaint, subjective, objective, assessment, plan, doctor_name, tags } = req.body;
    const n = await ClinicalNote.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.clinicId },
      { $set: { chiefComplaint: chief_complaint, subjective, objective, assessment, plan, doctorName: doctor_name, tags } },
      { new: true }
    );
    if (!n) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Updated', id: n.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    await ClinicalNote.findOneAndDelete({ _id: req.params.id, clinicId: req.clinicId });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
