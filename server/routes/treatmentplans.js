const express = require('express');
const router = express.Router();
const { TreatmentPlan } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(verifyToken, resolveTenant);

router.get('/', async (req, res) => {
  try {
    const { patient_id, status, page = 1, limit = 20 } = req.query;
    const q = { clinicId: req.clinicId };
    if (patient_id) q.patientId = patient_id;
    if (status) q.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [docs, total] = await Promise.all([
      TreatmentPlan.find(q).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).populate('patientId', 'name phone'),
      TreatmentPlan.countDocuments(q),
    ]);
    const plans = docs.map(p => ({
      ...p.toJSON(),
      patient_name:  p.patientId?.name,
      patient_phone: p.patientId?.phone,
    }));
    res.json({ plans, total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const p = await TreatmentPlan.findOne({ _id: req.params.id, clinicId: req.clinicId }).populate('patientId', 'name phone');
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json({ ...p.toJSON(), patient_name: p.patientId?.name, patient_phone: p.patientId?.phone });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { patient_id, title, items = [], notes, start_date } = req.body;
    if (!patient_id || !title) return res.status(400).json({ error: 'Patient and title required' });
    const totalEstimate = items.reduce((s, i) => s + (parseFloat(i.estimatedCost) || 0), 0);
    const p = await TreatmentPlan.create({
      clinicId: req.clinicId, patientId: patient_id,
      title, items, notes, startDate: start_date, totalEstimate,
    });
    res.status(201).json({ message: 'Created', id: p.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, items, notes, status, start_date, end_date } = req.body;
    const plan = await TreatmentPlan.findOne({ _id: req.params.id, clinicId: req.clinicId });
    if (!plan) return res.status(404).json({ error: 'Not found' });
    if (title) plan.title = title;
    if (items) { plan.items = items; plan.totalEstimate = items.reduce((s, i) => s + (parseFloat(i.estimatedCost) || 0), 0); }
    if (notes !== undefined) plan.notes = notes;
    if (status) plan.status = status;
    if (start_date) plan.startDate = start_date;
    if (end_date) plan.endDate = end_date;
    await plan.save();
    res.json({ message: 'Updated', id: plan.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update single item status
router.put('/:id/items/:index', async (req, res) => {
  try {
    const { status, completed_at, notes } = req.body;
    const plan = await TreatmentPlan.findOne({ _id: req.params.id, clinicId: req.clinicId });
    if (!plan) return res.status(404).json({ error: 'Not found' });
    const idx = parseInt(req.params.index);
    if (!plan.items[idx]) return res.status(404).json({ error: 'Item not found' });
    if (status) plan.items[idx].status = status;
    if (completed_at) plan.items[idx].completedAt = completed_at;
    if (notes !== undefined) plan.items[idx].notes = notes;
    if (status === 'completed' && !plan.items[idx].completedAt) {
      plan.items[idx].completedAt = new Date().toISOString().split('T')[0];
    }
    plan.markModified('items');
    await plan.save();
    res.json({ message: 'Item updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    await TreatmentPlan.findOneAndDelete({ _id: req.params.id, clinicId: req.clinicId });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
