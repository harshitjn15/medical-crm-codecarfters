const express = require('express');
const router = express.Router();
const { InvoiceTemplate } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(verifyToken, resolveTenant);

router.get('/', async (req, res) => {
  try {
    let t = await InvoiceTemplate.findOne({ clinicId: req.clinicId });
    if (!t) return res.json({ layout:'classic', primaryColor:'#0f4c75', showGst:true, showDoctorName:true });
    res.json(t.toJSON());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/', async (req, res) => {
  try {
    const { layout, logoData, logoName, primaryColor, headerNote, footerNote, showGst, showDoctorName, doctorName, doctorDegree, regNumber } = req.body;
    const t = await InvoiceTemplate.findOneAndUpdate(
      { clinicId: req.clinicId },
      { $set: { layout, logoData, logoName, primaryColor, headerNote, footerNote, showGst, showDoctorName, doctorName, doctorDegree, regNumber } },
      { upsert: true, new: true }
    );
    res.json({ message: 'Saved', id: t.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
