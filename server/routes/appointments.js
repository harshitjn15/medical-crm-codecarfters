const express = require('express');
const router = express.Router();
const { Appointment } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { resolveTenant, resolvePublicTenant } = require('../middleware/tenantMiddleware');

const ALL_SLOTS = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','14:00','14:30','15:00','15:30','16:00','16:30','17:00'];

router.get('/available-slots', resolvePublicTenant, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date required' });
    const booked = await Appointment.find({ clinicId: req.clinicId, appointmentDate: date, status: { $ne: 'cancelled' } }).select('appointmentTime');
    const bookedTimes = booked.map(b => b.appointmentTime);
    res.json({ slots: ALL_SLOTS.filter(s => !bookedTimes.includes(s)), booked: bookedTimes });
  } catch (err) { console.error('[appointments]', err.message); res.status(500).json({ error: err.message || 'Failed' }); }
});

router.post('/book', resolvePublicTenant, async (req, res) => {
  try {
    const { patient_name, patient_phone, patient_email, appointment_date, appointment_time, reason } = req.body;
    if (!patient_name || !appointment_date || !appointment_time) return res.status(400).json({ error: 'Name, date and time required' });
    const conflict = await Appointment.findOne({ clinicId: req.clinicId, appointmentDate: appointment_date, appointmentTime: appointment_time, status: { $ne: 'cancelled' } });
    if (conflict) return res.status(409).json({ error: 'Slot already booked' });
    const a = await Appointment.create({ clinicId: req.clinicId, patientName: patient_name, patientPhone: patient_phone, patientEmail: patient_email, appointmentDate: appointment_date, appointmentTime: appointment_time, reason });
    res.status(201).json({ message: 'Booked', id: a.id });
  } catch (err) { res.status(500).json({ error: 'Booking failed' }); }
});

router.get('/clinic-info', resolvePublicTenant, (req, res) => res.json(req.clinic));

router.use(verifyToken, resolveTenant);

router.get('/', async (req, res) => {
  try {
    const { status, filter, page = 1, limit = 30 } = req.query;
    const q = { clinicId: req.clinicId };
    if (status) q.status = status;
    if (filter === 'today') q.appointmentDate = new Date().toISOString().split('T')[0];
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [docs, total] = await Promise.all([
      Appointment.find(q).sort({ appointmentDate: -1, appointmentTime: 1 }).skip(skip).limit(parseInt(limit)),
      Appointment.countDocuments(q),
    ]);
    // Flatten camelCase → snake_case so client code works unchanged
    const appointments = docs.map(a => ({
      ...a.toJSON(),
      patient_name:  a.patientName,
      patient_phone: a.patientPhone,
      patient_email: a.patientEmail,
      appointment_date: a.appointmentDate,
      appointment_time: a.appointmentTime,
    }));
    res.json({ appointments, total });
  } catch (err) { console.error('[appointments]', err.message); res.status(500).json({ error: err.message || 'Failed' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const a = await Appointment.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.clinicId },
      { $set: { ...(status && { status }), ...(notes !== undefined && { notes }) } },
      { new: true }
    );
    if (!a) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Updated', id: a.id });
  } catch (err) { console.error('[appointments]', err.message); res.status(500).json({ error: err.message || 'Failed' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await Appointment.findOneAndDelete({ _id: req.params.id, clinicId: req.clinicId });
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { console.error('[appointments]', err.message); res.status(500).json({ error: err.message || 'Failed' }); }
});

module.exports = router;
