const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Clinic, User, Patient, Appointment, Invoice, ClinicWebsite } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenantMiddleware');
const { requireRole } = require('../middleware/requireRole');

router.use(verifyToken, resolveTenant, requireRole('super_admin'));

router.get('/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [total_clinics, active_clinics, total_patients, total_users, total_invoices, revenueAgg, today_appointments] = await Promise.all([
      Clinic.countDocuments(),
      Clinic.countDocuments({ isActive: true }),
      Patient.countDocuments(),
      User.countDocuments(),
      Invoice.countDocuments(),
      Invoice.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, s: { $sum: '$total' } } }]),
      Appointment.countDocuments({ appointmentDate: today }),
    ]);
    res.json({ total_clinics, active_clinics, total_patients, total_users, total_invoices, total_revenue: revenueAgg[0]?.s || 0, today_appointments });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/clinics', async (req, res) => {
  try {
    const docs = await Clinic.find().sort({ createdAt: -1 });
    const result = await Promise.all(docs.map(async c => {
      const [patient_count, user_count, revenueAgg] = await Promise.all([
        Patient.countDocuments({ clinicId: c._id }),
        User.countDocuments({ clinicId: c._id }),
        Invoice.aggregate([{ $match: { clinicId: c._id, status: 'paid' } }, { $group: { _id: null, s: { $sum: '$total' } } }]),
      ]);
      return { ...c.toJSON(), patient_count, user_count, total_revenue: revenueAgg[0]?.s || 0 };
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/clinics/:id', async (req, res) => {
  try {
    const clinic = await Clinic.findById(req.params.id);
    if (!clinic) return res.status(404).json({ error: 'Not found' });
    const [users, recentA, recentP, recentI] = await Promise.all([
      User.find({ clinicId: req.params.id }).select('-password'),
      Appointment.find({ clinicId: req.params.id }).sort({ createdAt: -1 }).limit(5),
      Patient.find({ clinicId: req.params.id }).sort({ createdAt: -1 }).limit(5),
      Invoice.find({ clinicId: req.params.id }).sort({ createdAt: -1 }).limit(5),
    ]);
    const recentActivity = [
      ...recentA.map(a => ({ type: 'appointment', label: a.patientName, createdAt: a.createdAt })),
      ...recentP.map(p => ({ type: 'patient',     label: p.name,        createdAt: p.createdAt })),
      ...recentI.map(i => ({ type: 'invoice',     label: i.invoiceNumber, createdAt: i.createdAt })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

    res.json({ clinic: clinic.toJSON(), users: users.map(u => u.toJSON()), recentActivity });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/clinics', async (req, res) => {
  try {
    const { name, slug, address, phone, email, tagline, gstNumber, currency = 'INR', plan = 'basic', admin_username, admin_password, admin_email, admin_phone } = req.body;
    if (!name || !slug || !admin_username || !admin_password) return res.status(400).json({ error: 'name, slug, admin_username, admin_password required' });
    if (await Clinic.findOne({ slug })) return res.status(409).json({ error: 'Slug already taken' });
    if (await User.findOne({ username: admin_username })) return res.status(409).json({ error: 'Username already taken' });

    const clinic = await Clinic.create({ name, slug, address, phone, email, tagline, gstNumber, currency, plan });
    await User.create({ clinicId: clinic._id, username: admin_username, password: bcrypt.hashSync(admin_password, 10), email: admin_email, phone: admin_phone, role: 'admin' });
    await ClinicWebsite.create({ clinicId: clinic._id, heroTitle: name, heroSubtitle: tagline || 'Quality healthcare', services: ['General Consultation','Follow-up Visits','Prescription Management','Health Check-ups'] });

    res.status(201).json({ message: 'Clinic onboarded', clinic_id: clinic.id, slug, booking_url: `/book?clinic=${slug}` });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

router.put('/clinics/:id', async (req, res) => {
  try {
    const { name, address, phone, email, tagline, gstNumber, currency, plan } = req.body;
    const c = await Clinic.findByIdAndUpdate(req.params.id, { $set: { name, address, phone, email, tagline, gstNumber, currency, plan } }, { new: true });
    if (!c) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Updated', id: c.id });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.put('/clinics/:id/toggle', async (req, res) => {
  try {
    const clinic = await Clinic.findById(req.params.id);
    if (!clinic) return res.status(404).json({ error: 'Not found' });
    clinic.isActive = !clinic.isActive;
    await clinic.save();
    res.json({ is_active: clinic.isActive, message: `${clinic.name} ${clinic.isActive ? 'activated' : 'deactivated'}` });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.put('/clinics/:id/plan', async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['basic','pro','enterprise'].includes(plan)) return res.status(400).json({ error: 'Invalid plan' });
    const c = await Clinic.findByIdAndUpdate(req.params.id, { $set: { plan } }, { new: true });
    res.json({ message: `Plan updated to ${plan}`, id: c.id });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
