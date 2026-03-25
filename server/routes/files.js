const express = require('express');
const router = express.Router();
const { PatientFile } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenantMiddleware');
const { requireRole } = require('../middleware/requireRole');

router.use(verifyToken, resolveTenant);

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

router.get('/', async (req, res) => {
  try {
    const { patient_id } = req.query;
    if (!patient_id) return res.status(400).json({ error: 'patient_id required' });
    const files = await PatientFile.find({ clinicId: req.clinicId, patientId: patient_id })
      .select('-data') // exclude base64 from list — fetch individually on download
      .sort({ createdAt: -1 });
    res.json({ files: files.map(f => f.toJSON()) });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch files' }); }
});

// Upload — expects JSON body: { patient_id, filename, mimetype, data (base64), category, notes }
router.post('/upload', async (req, res) => {
  try {
    const { patient_id, filename, mimetype, data, category, notes } = req.body;
    if (!patient_id || !filename || !data) return res.status(400).json({ error: 'patient_id, filename and data required' });

    // Check size from base64 length
    const sizeBytes = Math.round((data.length * 3) / 4);
    if (sizeBytes > MAX_SIZE_BYTES) return res.status(413).json({ error: 'File too large — maximum 5MB' });

    const allowed = ['application/pdf','image/jpeg','image/png','image/jpg','image/webp','image/gif'];
    if (!allowed.includes(mimetype)) return res.status(400).json({ error: 'Only PDF and images allowed' });

    const f = await PatientFile.create({
      clinicId: req.clinicId, patientId: patient_id,
      filename: `${Date.now()}_${filename}`,
      originalName: filename,
      mimetype, data, size: sizeBytes,
      category: category || 'other', notes,
    });
    res.status(201).json({ message: 'Uploaded', id: f.id, originalName: filename, size: sizeBytes });
  } catch (err) { res.status(500).json({ error: 'Failed to upload file' }); }
});

// Download / view — returns base64 data URI
router.get('/:id', async (req, res) => {
  try {
    const f = await PatientFile.findOne({ _id: req.params.id, clinicId: req.clinicId });
    if (!f) return res.status(404).json({ error: 'Not found' });
    res.json({ ...f.toJSON() }); // includes data
  } catch (err) { res.status(500).json({ error: 'Failed to fetch file' }); }
});

router.delete('/:id', requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    await PatientFile.findOneAndDelete({ _id: req.params.id, clinicId: req.clinicId });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete file' }); }
});

module.exports = router;
