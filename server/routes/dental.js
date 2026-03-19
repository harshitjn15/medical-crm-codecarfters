const express = require('express');
const router = express.Router();
const { DentalChart } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(verifyToken, resolveTenant);

// Initialize all 32 teeth as healthy
function initTeeth() {
  return Array.from({ length: 32 }, (_, i) => ({
    toothNumber: i + 1,
    status: 'healthy',
    surfaces: [],
    notes: '',
  }));
}

// GET chart for a patient
router.get('/:patientId', async (req, res) => {
  try {
    let chart = await DentalChart.findOne({ clinicId: req.clinicId, patientId: req.params.patientId });
    if (!chart) {
      // Return a default blank chart without saving
      return res.json({ patientId: req.params.patientId, teeth: initTeeth(), isNew: true });
    }
    res.json(chart.toJSON());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT — update full chart (upsert)
router.put('/:patientId', async (req, res) => {
  try {
    const { teeth } = req.body;
    if (!teeth?.length) return res.status(400).json({ error: 'Teeth data required' });
    const chart = await DentalChart.findOneAndUpdate(
      { clinicId: req.clinicId, patientId: req.params.patientId },
      { $set: { teeth, lastUpdated: new Date().toISOString().split('T')[0] } },
      { upsert: true, new: true }
    );
    res.json({ message: 'Chart saved', id: chart.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH — update a single tooth
router.patch('/:patientId/tooth/:toothNumber', async (req, res) => {
  try {
    const { status, surfaces, notes } = req.body;
    const toothNum = parseInt(req.params.toothNumber);

    let chart = await DentalChart.findOne({ clinicId: req.clinicId, patientId: req.params.patientId });
    if (!chart) {
      chart = new DentalChart({ clinicId: req.clinicId, patientId: req.params.patientId, teeth: initTeeth() });
    }

    const tooth = chart.teeth.find(t => t.toothNumber === toothNum);
    if (!tooth) return res.status(404).json({ error: 'Tooth not found' });

    if (status !== undefined) tooth.status = status;
    if (surfaces !== undefined) tooth.surfaces = surfaces;
    if (notes !== undefined) tooth.notes = notes;
    if (status && status !== 'healthy') tooth.treatedAt = new Date().toISOString().split('T')[0];

    chart.lastUpdated = new Date().toISOString().split('T')[0];
    chart.markModified('teeth');
    await chart.save();
    res.json({ message: 'Tooth updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
