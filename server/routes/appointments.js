const express = require('express');
const router = express.Router();
const { Appointment, Patient } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { resolveTenant, resolvePublicTenant } = require('../middleware/tenantMiddleware');
const { requireRole } = require('../middleware/requireRole');

const ALL_SLOTS = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','14:00','14:30','15:00','15:30','16:00','16:30','17:00'];

router.get('/available-slots', resolvePublicTenant, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date required' });
    const booked = await Appointment.find({ clinicId: req.clinicId, appointmentDate: date, status: { $ne: 'cancelled' } }).select('appointmentTime');
    const bookedTimes = booked.map(b => b.appointmentTime);
    res.json({ slots: ALL_SLOTS.filter(s => !bookedTimes.includes(s)), booked: bookedTimes });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch available slots' }); }
});

router.post('/book', resolvePublicTenant, async (req, res) => {
  try {
    const { patient_name, patient_phone, patient_email, appointment_date, appointment_time, reason, patient_id } = req.body;
    if (!patient_name || !appointment_date || !appointment_time) return res.status(400).json({ error: 'Name, date and time required' });

    // Validate past dates/times
    const apptDateTime = new Date(`${appointment_date}T${appointment_time}`);
    if (apptDateTime < new Date()) {
      return res.status(400).json({ error: 'Appointment cannot be scheduled for past date/time' });
    }

    const conflict = await Appointment.findOne({ clinicId: req.clinicId, appointmentDate: appointment_date, appointmentTime: appointment_time, status: { $ne: 'cancelled' } });
    if (conflict) return res.status(409).json({ error: 'Slot already booked' });
    
    let finalPatientId = patient_id;
    if (!finalPatientId) {
      let p = null;
      if (patient_phone) p = await Patient.findOne({ clinicId: req.clinicId, phone: patient_phone });
      if (!p && patient_email) p = await Patient.findOne({ clinicId: req.clinicId, email: patient_email });
      if (!p) p = await Patient.create({ clinicId: req.clinicId, name: patient_name, phone: patient_phone, email: patient_email });
      finalPatientId = p._id;
    }

    const a = await Appointment.create({ clinicId: req.clinicId, patientId: finalPatientId, patientName: patient_name, patientPhone: patient_phone, patientEmail: patient_email, appointmentDate: appointment_date, appointmentTime: appointment_time, reason });
    res.status(201).json({ message: 'Booked', id: a.id });
  } catch (err) { res.status(500).json({ error: 'Booking failed' }); }
});

router.get('/clinic-info', resolvePublicTenant, (req, res) => res.json(req.clinic));

router.use(verifyToken, resolveTenant);

// ── POST /api/appointments — authenticated booking (staff/admin) ─────────
router.post('/', async (req, res) => {
  try {
    const { patient_name, patient_phone, patient_email, appointment_date, appointment_time, reason, patient_id } = req.body;
    if (!patient_name || !appointment_date || !appointment_time)
      return res.status(400).json({ error: 'Name, date and time required' });

    // Validate past dates/times
    const apptDateTime = new Date(`${appointment_date}T${appointment_time}`);
    if (apptDateTime < new Date()) {
      return res.status(400).json({ error: 'Appointment cannot be scheduled for past date/time' });
    }
    const conflict = await Appointment.findOne({
      clinicId: req.clinicId,
      appointmentDate: appointment_date,
      appointmentTime: appointment_time,
      status: { $ne: 'cancelled' },
    });
    if (conflict) return res.status(409).json({ error: 'Slot already booked', conflictWith: conflict.patientName });

    let finalPatientId = patient_id;
    if (!finalPatientId) {
      let p = null;
      if (patient_phone) p = await Patient.findOne({ clinicId: req.clinicId, phone: patient_phone });
      if (!p && patient_email) p = await Patient.findOne({ clinicId: req.clinicId, email: patient_email });
      if (!p) p = await Patient.create({ clinicId: req.clinicId, name: patient_name, phone: patient_phone, email: patient_email });
      finalPatientId = p._id;
    }

    const a = await Appointment.create({
      clinicId: req.clinicId,
      patientId: finalPatientId,
      patientName: patient_name,
      patientPhone: patient_phone,
      patientEmail: patient_email,
      appointmentDate: appointment_date,
      appointmentTime: appointment_time,
      reason,
    });
    res.status(201).json({ message: 'Booked', id: a.id });
  } catch (err) { res.status(500).json({ error: 'Booking failed' }); }
});


// Supports: ?status=, ?filter=today, ?from=YYYY-MM-DD&to=YYYY-MM-DD, ?page=, ?limit=, ?client_today=
router.get('/', async (req, res) => {
  try {
    const { status, filter, from, to, date, client_today, page = 1, limit = 20 } = req.query;
    const q = { clinicId: req.clinicId };
    if (status) q.status = status;
    if (filter === 'today') {
      q.appointmentDate = client_today || new Date().toISOString().split('T')[0];
    }
    if (date) {
      q.appointmentDate = date;
    }
    // Date range filter for calendar view
    if (from || to) {
      q.appointmentDate = {};
      if (from) q.appointmentDate.$gte = from;
      if (to)   q.appointmentDate.$lte = to;
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [docs, total] = await Promise.all([
      Appointment.find(q).sort({ appointmentDate: 1, appointmentTime: 1 }).skip(skip).limit(parseInt(limit)),
      Appointment.countDocuments(q),
    ]);
    // Flatten camelCase → snake_case AND include patientId for navigation
    const appointments = docs.map(a => ({
      ...a.toJSON(),
      patient_name:     a.patientName,
      patient_phone:    a.patientPhone,
      patient_email:    a.patientEmail,
      appointment_date: a.appointmentDate,
      appointment_time: a.appointmentTime,
      patient_id:       a.patientId?.toString() || null,
    }));

    const todayStr = client_today || new Date().toISOString().split('T')[0];
    const agg = await Appointment.aggregate([
      { $match: { clinicId: req.clinicId } },
      { $group: {
          _id: null,
          all: { $sum: 1 },
          today: { $sum: { $cond: [{ $eq: ['$appointmentDate', todayStr] }, 1, 0] } },
          scheduled: { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
      }}
    ]).catch(() => []);
    const stats = agg[0] || { all: 0, today: 0, scheduled: 0, completed: 0, cancelled: 0 };

    res.json({ appointments, total, stats });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch appointments' }); }
});

// ── PATCH /:id/reschedule — drag-and-drop calendar reschedule ──────────
router.patch('/:id/reschedule', requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const { appointment_date, appointment_time } = req.body;
    if (!appointment_date || !appointment_time) return res.status(400).json({ error: 'date and time required' });

    // Validate past dates/times
    const apptDateTime = new Date(`${appointment_date}T${appointment_time}`);
    if (apptDateTime < new Date()) {
      return res.status(400).json({ error: 'Appointment cannot be scheduled for past date/time' });
    }

    // Check for slot conflict (excluding this appointment)
    const conflict = await Appointment.findOne({
      clinicId: req.clinicId,
      _id: { $ne: req.params.id },
      appointmentDate: appointment_date,
      appointmentTime: appointment_time,
      status: { $ne: 'cancelled' },
    });
    if (conflict) return res.status(409).json({ error: 'Slot already booked', conflictWith: conflict.patientName });

    const a = await Appointment.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.clinicId },
      { $set: { appointmentDate: appointment_date, appointmentTime: appointment_time } },
      { new: true }
    );
    if (!a) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Rescheduled', id: a.id, appointment_date: a.appointmentDate, appointment_time: a.appointmentTime });
  } catch (err) { res.status(500).json({ error: 'Failed to reschedule' }); }
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
  } catch (err) { res.status(500).json({ error: 'Failed to update appointment' }); }
});

router.delete('/:id', requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const r = await Appointment.findOneAndDelete({ _id: req.params.id, clinicId: req.clinicId });
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete appointment' }); }
});

module.exports = router;
