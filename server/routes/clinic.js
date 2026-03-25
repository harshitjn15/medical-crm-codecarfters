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
        patient_id:       a.patientId?.toString() || null,
        patient_phone:    a.patientPhone,
        appointment_date: a.appointmentDate,
        appointment_time: a.appointmentTime,
      })),
      pending_followups: followup_docs.map(f => ({
        ...f.toJSON(),
        patient_name:  f.patientId?.name,
        patient_id:    f.patientId?._id?.toString() || null,
        followup_date: f.followupDate,
        followup_type: f.followupType,
      })),
      recent_patients: recent_docs.map(p => p.toJSON()),
      monthly_revenue,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

router.get('/revenue-analytics', async (req, res) => {
  try {
    const { timeframe = 'monthly' } = req.query; // 'daily', 'weekly', 'monthly'
    const cid = req.clinicId;
    const now = new Date();
    
    // Determine the date range based on timeframe
    let startDate;
    let prevStartDate;
    let prevEndDate;
    if (timeframe === 'daily') {
      // Current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (timeframe === 'weekly') {
      // Last 12 weeks
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 84);
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(startDate.getDate() - 84);
      prevEndDate = new Date(startDate);
    } else {
      // Current Year
      startDate = new Date(now.getFullYear(), 0, 1);
      prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
      prevEndDate = new Date(now.getFullYear() - 1, 11, 31);
    }

    const startStr = startDate.toISOString().split('T')[0];
    const prevStartStr = prevStartDate.toISOString().split('T')[0];
    const prevEndStr = prevEndDate.toISOString().split('T')[0];

    // Build the grouping format for the aggregation
    let groupIdFormat;
    if (timeframe === 'daily') {
      groupIdFormat = { $substr: ['$issueDate', 0, 10] }; // YYYY-MM-DD
    } else if (timeframe === 'weekly') {
      // MongoDB week is a bit tricky, but we can group by ISO week using $isoWeek and $isoWeekYear
      groupIdFormat = { $concat: [ { $toString: { $isoWeekYear: { $toDate: '$issueDate' } } }, '-W', { $toString: { $isoWeek: { $toDate: '$issueDate' } } } ] };
    } else {
      groupIdFormat = { $substr: ['$issueDate', 0, 7] }; // YYYY-MM
    }

    // 1. Chart Data (Current Period)
    const chartData = await Invoice.aggregate([
      { $match: { clinicId: cid, issueDate: { $gte: startStr }, status: 'paid' } },
      { $group: { _id: groupIdFormat, revenue: { $sum: '$total' } } },
      { $sort: { _id: 1 } }
    ]);

    // Format chart data
    const formattedChartData = chartData.map(d => ({ date: d._id, revenue: d.revenue }));

    // 2. High-Level KPIs (Current Period)
    const currentKpis = await Invoice.aggregate([
      { $match: { clinicId: cid, issueDate: { $gte: startStr } } },
      { $group: {
          _id: null,
          totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$total', 0] } },
          pendingRevenue: { $sum: { $cond: [{ $in: ['$status', ['sent', 'draft']] }, '$total', 0] } },
          totalInvoices: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
      }}
    ]);
    const curr = currentKpis[0] || { totalRevenue: 0, pendingRevenue: 0, totalInvoices: 0 };
    const avgInvoiceValue = curr.totalInvoices > 0 ? Math.round(curr.totalRevenue / curr.totalInvoices) : 0;

    // 3. Previous Period KPIs for Growth
    const prevKpis = await Invoice.aggregate([
      { $match: { clinicId: cid, issueDate: { $gte: prevStartStr, $lte: prevEndStr } } },
      { $group: { _id: null, totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$total', 0] } } } }
    ]);
    const prevRevenue = prevKpis[0]?.totalRevenue || 0;
    
    let growthNum = 0;
    if (prevRevenue > 0) {
      growthNum = ((curr.totalRevenue - prevRevenue) / prevRevenue) * 100;
    } else if (curr.totalRevenue > 0) {
      growthNum = 100;
    }
    const growth = parseFloat(growthNum.toFixed(1));

    // 4. Min/Max insights
    const revenues = formattedChartData.map(d => d.revenue);
    const maxRev = revenues.length ? Math.max(...revenues) : 0;
    const minRev = revenues.length ? Math.min(...revenues) : 0;
    const topDay = formattedChartData.find(d => d.revenue === maxRev)?.date || null;
    const bottomDay = formattedChartData.find(d => d.revenue === minRev)?.date || null;

    res.json({
      chartData: formattedChartData,
      kpis: {
        totalRevenue: curr.totalRevenue,
        pendingRevenue: curr.pendingRevenue,
        totalInvoices: curr.totalInvoices,
        avgInvoiceValue,
        growth,
        prevRevenue,
      },
      insights: { topDay, bottomDay, maxRev, minRev }
    });
  } catch (err) {
    console.error('[revenue-analytics]', err);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

module.exports = router;
