const express = require('express');
const router = express.Router();
const { Patient, Appointment, Followup, Invoice } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(verifyToken, resolveTenant);

router.get('/dashboard', async (req, res) => {
  try {
    const cid   = req.clinicId;
    const today = new Date().toISOString().split('T')[0];
    const ym    = today.slice(0, 7);

    const [
      total_patients, today_appointments, pending_followups,
      revenueAgg, pendingAgg,
      upcoming_docs, followup_docs, recent_docs, monthly_revenue,
    ] = await Promise.all([
      Patient.countDocuments({ clinicId: cid }),
      Appointment.countDocuments({ clinicId: cid, appointmentDate: today }),
      Followup.countDocuments({ clinicId: cid, status: 'pending' }),

      Invoice.aggregate([{ $match: { clinicId: cid, status: 'paid', issueDate: { $regex: `^${ym}` } } }, { $group: { _id: null, s: { $sum: '$total' } } }]),
      Invoice.aggregate([{ $match: { clinicId: cid, status: { $in: ['draft','sent'] } } }, { $group: { _id: null, s: { $sum: '$total' } } }]),

      Appointment.find({ clinicId: cid, appointmentDate: { $gte: today }, status: 'scheduled' }).sort({ appointmentDate: 1, appointmentTime: 1 }).limit(10),
      Followup.find({ clinicId: cid, status: 'pending' }).sort({ followupDate: 1 }).limit(5).populate('patientId', 'name'),
      Patient.find({ clinicId: cid }).sort({ createdAt: -1 }).limit(5),

      Invoice.aggregate([
        { $match: { clinicId: cid, status: 'paid' } },
        { $group: { _id: { $substr: ['$issueDate', 0, 7] }, total: { $sum: '$total' } } },
        { $sort: { _id: -1 } }, { $limit: 6 },
        { $project: { month: '$_id', total: 1, _id: 0 } },
      ]),
    ]);

    res.json({
      stats: {
        total_patients,
        today_appointments,
        pending_followups,
        revenue_this_month: revenueAgg[0]?.s || 0,
        pending_revenue:    pendingAgg[0]?.s  || 0,
      },
      // Flatten camelCase → snake_case for the React client
      upcoming_appointments: upcoming_docs.map(a => ({
        ...a.toJSON(),
        patient_name:     a.patientName,
        patient_phone:    a.patientPhone,
        appointment_date: a.appointmentDate,
        appointment_time: a.appointmentTime,
      })),
      pending_followups: followup_docs.map(f => ({
        ...f.toJSON(),
        patient_name:  f.patientId?.name,
        followup_date: f.followupDate,
        followup_type: f.followupType,
      })),
      recent_patients: recent_docs.map(p => p.toJSON()),
      monthly_revenue,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
