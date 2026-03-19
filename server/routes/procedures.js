// ── Procedure Library ─────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { Procedure } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(verifyToken, resolveTenant);

// Default procedures seeded per specialty
const DEFAULT_PROCEDURES = {
  general:      [{ name:'General Consultation', category:'Consultation', defaultPrice:500 },{ name:'Follow-up Visit', category:'Consultation', defaultPrice:300 },{ name:'Health Check-up', category:'Consultation', defaultPrice:800 },{ name:'Vaccination', category:'Procedure', defaultPrice:400 }],
  dental:       [{ name:'Consultation', category:'Consultation', defaultPrice:300 },{ name:'Scaling & Polishing', category:'Preventive', defaultPrice:1200 },{ name:'Tooth Extraction (Simple)', category:'Surgery', defaultPrice:800 },{ name:'Tooth Extraction (Surgical)', category:'Surgery', defaultPrice:2500 },{ name:'Root Canal Treatment', category:'Endodontic', defaultPrice:4500 },{ name:'Composite Filling', category:'Restorative', defaultPrice:1200 },{ name:'Amalgam Filling', category:'Restorative', defaultPrice:800 },{ name:'PFM Crown', category:'Prosthetic', defaultPrice:5000 },{ name:'Zirconia Crown', category:'Prosthetic', defaultPrice:8000 },{ name:'Dental X-Ray (IOPA)', category:'Radiology', defaultPrice:200 },{ name:'OPG X-Ray', category:'Radiology', defaultPrice:600 },{ name:'Teeth Whitening', category:'Cosmetic', defaultPrice:6000 },{ name:'Dental Implant', category:'Implant', defaultPrice:25000 },{ name:'Denture (Complete)', category:'Prosthetic', defaultPrice:8000 }],
  dermatology:  [{ name:'Dermatology Consultation', category:'Consultation', defaultPrice:700 },{ name:'Patch Test', category:'Diagnostic', defaultPrice:1500 },{ name:'Cryotherapy', category:'Procedure', defaultPrice:2000 },{ name:'Chemical Peel', category:'Cosmetic', defaultPrice:3000 },{ name:'Laser Treatment', category:'Cosmetic', defaultPrice:5000 },{ name:'Botox Injection', category:'Cosmetic', defaultPrice:8000 },{ name:'Skin Biopsy', category:'Diagnostic', defaultPrice:1200 }],
  cardiology:   [{ name:'Cardiology Consultation', category:'Consultation', defaultPrice:1000 },{ name:'ECG', category:'Diagnostic', defaultPrice:300 },{ name:'2D Echo', category:'Diagnostic', defaultPrice:2500 },{ name:'Stress Test (TMT)', category:'Diagnostic', defaultPrice:2000 },{ name:'Holter Monitoring', category:'Diagnostic', defaultPrice:3000 }],
  orthopedics:  [{ name:'Ortho Consultation', category:'Consultation', defaultPrice:700 },{ name:'Joint Injection', category:'Procedure', defaultPrice:1500 },{ name:'Plaster Application', category:'Procedure', defaultPrice:500 },{ name:'Physiotherapy Session', category:'Therapy', defaultPrice:400 }],
  ent:          [{ name:'ENT Consultation', category:'Consultation', defaultPrice:600 },{ name:'Ear Cleaning', category:'Procedure', defaultPrice:500 },{ name:'Nasal Cauterization', category:'Procedure', defaultPrice:1200 },{ name:'Audiometry', category:'Diagnostic', defaultPrice:800 }],
  gynecology:   [{ name:'OB/GYN Consultation', category:'Consultation', defaultPrice:700 },{ name:'Pap Smear', category:'Diagnostic', defaultPrice:600 },{ name:'Ultrasound', category:'Diagnostic', defaultPrice:1200 },{ name:'IUD Insertion', category:'Procedure', defaultPrice:2000 }],
  pediatrics:   [{ name:'Paediatric Consultation', category:'Consultation', defaultPrice:500 },{ name:'Vaccination', category:'Preventive', defaultPrice:400 },{ name:'Growth Assessment', category:'Consultation', defaultPrice:300 }],
  ophthalmology:[{ name:'Eye Consultation', category:'Consultation', defaultPrice:600 },{ name:'Vision Test', category:'Diagnostic', defaultPrice:200 },{ name:'Retinal Exam', category:'Diagnostic', defaultPrice:800 },{ name:'Cataract Surgery', category:'Surgery', defaultPrice:30000 }],
};

router.get('/', async (req, res) => {
  try {
    const { category, search, active_only = 'true' } = req.query;
    const q = { clinicId: req.clinicId };
    if (active_only === 'true') q.isActive = true;
    if (category) q.category = category;
    if (search) q.name = new RegExp(search, 'i');
    const procedures = await Procedure.find(q).sort({ category: 1, name: 1 });
    res.json({ procedures: procedures.map(p => p.toJSON()) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Seed default procedures for clinic specialty
router.post('/seed', async (req, res) => {
  try {
    const { specialty = 'general' } = req.body;
    const defaults = DEFAULT_PROCEDURES[specialty] || DEFAULT_PROCEDURES.general;
    const existing = await Procedure.countDocuments({ clinicId: req.clinicId });
    if (existing > 0) return res.json({ message: 'Already seeded', count: existing });
    const toCreate = defaults.map(p => ({ ...p, clinicId: req.clinicId, specialty }));
    const created = await Procedure.insertMany(toCreate);
    res.status(201).json({ message: `Seeded ${created.length} procedures`, count: created.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, category, defaultPrice, duration, description, specialty } = req.body;
    if (!name || !category) return res.status(400).json({ error: 'Name and category required' });
    const p = await Procedure.create({ clinicId: req.clinicId, name, category, defaultPrice: defaultPrice||0, duration, description, specialty });
    res.status(201).json({ message: 'Created', id: p.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, category, defaultPrice, duration, description, isActive } = req.body;
    const p = await Procedure.findOneAndUpdate({ _id: req.params.id, clinicId: req.clinicId },
      { $set: { name, category, defaultPrice, duration, description, isActive } }, { new: true });
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Updated', id: p.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await Procedure.findOneAndDelete({ _id: req.params.id, clinicId: req.clinicId });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
