const express = require('express');
const router = express.Router();
const { Prescription, Clinic, ClinicWebsite, User } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { resolveTenant } = require('../middleware/tenantMiddleware');
const { sendEmail, appointmentConfirmationEmail } = require('../services/emailService');

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
  } catch (err) { res.status(500).json({ error: 'Failed to fetch prescriptions' }); }
});

// ── GET /:id/print — prescription with full clinic details for letterhead ──
router.get('/:id/print', async (req, res) => {
  try {
    const rx = await Prescription.findOne({ _id: req.params.id, clinicId: req.clinicId })
      .populate('patientId', 'name phone email address dateOfBirth gender bloodGroup allergies');
    if (!rx) return res.status(404).json({ error: 'Not found' });

    const [clinic, website] = await Promise.all([
      Clinic.findById(req.clinicId),
      ClinicWebsite.findOne({ clinicId: req.clinicId }),
    ]);

    const rxJson = rx.toJSON();
    res.json({
      ...rxJson,
      patient_name:    rx.patientId?.name,
      patient_phone:   rx.patientId?.phone,
      patient_email:   rx.patientId?.email,
      patient_address: rx.patientId?.address,
      patient_dob:     rx.patientId?.dateOfBirth,
      patient_gender:  rx.patientId?.gender,
      patient_blood:   rx.patientId?.bloodGroup,
      patient_allergies: rx.patientId?.allergies,
      clinic_name:     clinic?.name,
      clinic_address:  clinic?.address,
      clinic_phone:    clinic?.phone,
      clinic_email:    clinic?.email,
      clinic_logo:     website?.logoData || clinic?.logoUrl || null,
      clinic_tagline:  clinic?.tagline,
    });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch prescription for print' }); }
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
  } catch (err) { res.status(500).json({ error: 'Failed to fetch prescription' }); }
});

// ── POST /:id/share-email — send prescription to patient email ──────────
router.post('/:id/share-email', async (req, res) => {
  try {
    const rx = await Prescription.findOne({ _id: req.params.id, clinicId: req.clinicId })
      .populate('patientId', 'name phone email');
    if (!rx) return res.status(404).json({ error: 'Not found' });

    const { to_email } = req.body;
    const recipient = to_email || rx.patientId?.email;
    if (!recipient) return res.status(400).json({ error: 'No email address available for patient' });

    const clinic = await Clinic.findById(req.clinicId);
    const meds = (rx.medications || []).map(m => `• ${m.name} — ${m.dosage}, ${m.frequency} for ${m.duration}`).join('\n');

    const result = await sendEmail({
      to: recipient,
      subject: `Your Prescription — ${clinic?.name || 'Medical CRM'}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
          <div style="background:#0f4c75;padding:20px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:20px">💊 Prescription Details</h1>
            <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px">${clinic?.name}</p>
          </div>
          <div style="padding:24px">
            <p style="color:#475569">Dear <strong>${rx.patientId?.name}</strong>,</p>
            <p style="color:#475569">Please find your prescription details below.</p>
            ${rx.diagnosis ? `<p><strong>Diagnosis:</strong> ${rx.diagnosis}</p>` : ''}
            <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0">
              <strong>Medications:</strong>
              <ul style="margin:8px 0;padding-left:16px;color:#475569">
                ${(rx.medications || []).map(m => `<li><strong>${m.name}</strong> — ${m.dosage}, ${m.frequency} for ${m.duration}</li>`).join('')}
              </ul>
            </div>
            ${rx.instructions ? `<p><strong>Instructions:</strong> ${rx.instructions}</p>` : ''}
          </div>
        </div>
      `,
      text: `Prescription from ${clinic?.name}\n\nDiagnosis: ${rx.diagnosis || 'N/A'}\n\nMedications:\n${meds}\n\nInstructions: ${rx.instructions || 'N/A'}`,
    });

    if (result.skipped) return res.status(503).json({ error: 'Email service not configured', detail: result.skipped });
    if (!result.success) return res.status(500).json({ error: 'Failed to send email' });
    res.json({ message: 'Email sent', to: recipient });
  } catch (err) { res.status(500).json({ error: 'Failed to send prescription email' }); }
});

router.post('/', async (req, res) => {
  try {
    const { patient_id, diagnosis, medications, instructions, notes } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'Patient required' });
    const cleanMeds = (medications || []).filter(m => m && m.name && m.name.trim());
    const rx = await Prescription.create({
      clinicId: req.clinicId, patientId: patient_id,
      diagnosis: diagnosis || '', medications: cleanMeds,
      instructions: instructions || '', notes: notes || '',
    });
    res.status(201).json({ message: 'Created', id: rx.id });
  } catch (err) { res.status(500).json({ error: 'Failed to create prescription' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { diagnosis, medications, instructions, notes } = req.body;
    const cleanMeds = (medications || []).filter(m => m && m.name && m.name.trim());
    const rx = await Prescription.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.clinicId },
      { $set: { diagnosis: diagnosis || '', medications: cleanMeds, instructions: instructions || '', notes: notes || '' } },
      { new: true }
    );
    if (!rx) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Updated', id: rx.id });
  } catch (err) { res.status(500).json({ error: 'Failed to update prescription' }); }
});

router.delete('/:id', requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const r = await Prescription.findOneAndDelete({ _id: req.params.id, clinicId: req.clinicId });
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete prescription' }); }
});

module.exports = router;
