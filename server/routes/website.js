const express = require('express');
const router = express.Router();
const { ClinicWebsite, Clinic } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { resolveTenant, resolvePublicTenant } = require('../middleware/tenantMiddleware');

router.get('/public', resolvePublicTenant, async (req, res) => {
  try {
    const clinic = await Clinic.findById(req.clinicId).select('name address phone email tagline logoUrl');
    const ws     = await ClinicWebsite.findOne({ clinicId: req.clinicId });
    if (!ws) return res.json({ clinic: clinic.toJSON(), hero_title: clinic.name, hero_subtitle: clinic.tagline, primary_color: '#0f4c75', services: ['General Consultation','Follow-up Visits','Prescription Management','Health Check-ups'], working_hours: 'Mon–Sat: 9:00 AM – 6:00 PM', about_text: null, show_map: false, map_embed: null });
    res.json({ clinic: clinic.toJSON(), hero_title: ws.heroTitle||clinic.name, hero_subtitle: ws.heroSubtitle||clinic.tagline, primary_color: ws.primaryColor, services: ws.services, working_hours: ws.workingHours, about_text: ws.aboutText, show_map: ws.showMap, map_embed: ws.mapEmbed });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/settings', verifyToken, resolveTenant, async (req, res) => {
  try {
    const ws = await ClinicWebsite.findOne({ clinicId: req.clinicId });
    if (!ws) {
      const clinic = await Clinic.findById(req.clinicId);
      return res.json({ clinicId: req.clinicId, heroTitle: clinic.name, heroSubtitle: clinic.tagline||'', primaryColor:'#0f4c75', services:['General Consultation','Follow-up Visits'], workingHours:'Mon–Sat: 9:00 AM – 6:00 PM', aboutText:'', showMap:false, mapEmbed:'' });
    }
    res.json(ws.toJSON());
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.put('/settings', verifyToken, resolveTenant, async (req, res) => {
  try {
    const { heroTitle, heroSubtitle, primaryColor, services, workingHours, aboutText, showMap, mapEmbed } = req.body;
    const ws = await ClinicWebsite.findOneAndUpdate(
      { clinicId: req.clinicId },
      { $set: { heroTitle, heroSubtitle, primaryColor, services, workingHours, aboutText, showMap, mapEmbed } },
      { upsert: true, new: true }
    );
    res.json({ message: 'Saved', id: ws.id });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
