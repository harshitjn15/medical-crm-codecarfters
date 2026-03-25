const express = require('express');
const router = express.Router();
const { VitalSigns } = require('../models');
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
      VitalSigns.find(q).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).populate('patientId', 'name'),
      VitalSigns.countDocuments(q),
    ]);
    res.json({ vitals: docs.map(d => ({ ...d.toJSON(), id: d._id, patient_name: d.patientId?.name })), total });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { patient_id, appointment_id, recorded_at, bp_systolic, bp_diastolic, pulse, temperature, temp_unit, weight, height, spo2, blood_sugar, blood_sugar_type, respiratory_rate, notes } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'Patient required' });

    // Auto-calculate BMI if height and weight provided
    let bmi;
    if (weight && height) {
      const hm = height / 100;
      bmi = parseFloat((weight / (hm * hm)).toFixed(1));
    }

    const v = await VitalSigns.create({
      clinicId: req.clinicId, patientId: patient_id,
      appointmentId: appointment_id || undefined,
      recordedAt: recorded_at || new Date().toISOString().split('T')[0],
      bpSystolic: bp_systolic, bpDiastolic: bp_diastolic, pulse,
      temperature, tempUnit: temp_unit || 'C',
      weight, height, bmi, spo2,
      bloodSugar: blood_sugar, bloodSugarType: blood_sugar_type || 'random',
      respiratoryRate: respiratory_rate, notes,
    });
    res.status(201).json({ message: 'Recorded', id: v.id });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    await VitalSigns.findOneAndDelete({ _id: req.params.id, clinicId: req.clinicId });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
