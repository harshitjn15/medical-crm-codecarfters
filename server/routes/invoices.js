const express = require('express');
const router = express.Router();
const { Invoice } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(verifyToken, resolveTenant);

function calcTotals(items, taxRate, discount) {
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const taxable  = Math.max(0, subtotal - (discount || 0));
  const taxAmount = parseFloat(((taxable * taxRate) / 100).toFixed(2));
  const total     = parseFloat((taxable + taxAmount).toFixed(2));
  return { subtotal, taxAmount, total };
}

async function genInvoiceNumber(clinicId) {
  const ym     = new Date().toISOString().slice(0, 7).replace('-', '');
  const prefix = `INV-${ym}-`;
  const count  = await Invoice.countDocuments({ clinicId, invoiceNumber: { $regex: `^${prefix}` } });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
}

// Flatten Mongo doc → snake_case fields expected by client
function toClient(inv) {
  const j = inv.toJSON ? inv.toJSON() : inv;

  // Remap items: unitPrice → unit_price so InvoiceForm can read/edit them
  const items = (j.items || []).map(item => ({
    ...item,
    unit_price: item.unitPrice ?? item.unit_price ?? 0,
  }));

  // patientId may be a populated object or a plain string id after toJSON
  const patientObj = j.patientId && typeof j.patientId === 'object' ? j.patientId : null;

  return {
    ...j,
    items,
    // IDs
    patient_id:      patientObj?.id  || (typeof j.patientId === 'string' ? j.patientId : undefined),
    // Flat display fields
    patient_name:    patientObj?.name    || j.patient_name,
    patient_phone:   patientObj?.phone   || j.patient_phone,
    patient_email:   patientObj?.email   || j.patient_email,
    patient_address: patientObj?.address || j.patient_address,
    // snake_case renames for all camelCase invoice fields
    invoice_number:  j.invoiceNumber,
    issue_date:      j.issueDate,
    due_date:        j.dueDate,
    tax_rate:        j.taxRate,
    tax_amount:      j.taxAmount,
    payment_method:  j.paymentMethod,
    paid_at:         j.paidAt,
  };
}

router.get('/', async (req, res) => {
  try {
    const { status, patient_id, from, to, page = 1, limit = 20 } = req.query;
    const q = { clinicId: req.clinicId };
    if (status)     q.status    = status;
    if (patient_id) q.patientId = patient_id;
    if (from || to) {
      q.issueDate = {};
      if (from) q.issueDate.$gte = from;
      if (to)   q.issueDate.$lte = to;
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [docs, total] = await Promise.all([
      Invoice.find(q).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).populate('patientId', 'name phone'),
      Invoice.countDocuments(q),
    ]);

    const agg = await Invoice.aggregate([
      { $match: { clinicId: req.clinicId } },  // req.clinicId is already ObjectId from middleware
      { $group: {
          _id: null,
          collected:     { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$total', 0] } },
          pending:       { $sum: { $cond: [{ $in: ['$status', ['sent', 'draft']] }, '$total', 0] } },
          paid_count:    { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
          pending_count: { $sum: { $cond: [{ $in: ['$status', ['sent', 'draft']] }, 1, 0] } },
      }}
    ]).catch(() => []);
    const stats = agg[0] || { collected: 0, pending: 0, paid_count: 0, pending_count: 0 };

    res.json({ invoices: docs.map(toClient), total, stats });
  } catch (err) { console.error('[invoices]', err.message); res.status(500).json({ error: err.message || 'Failed' }); }
});

router.get('/:id/print', async (req, res) => {
  try {
    const inv = await Invoice.findOne({ _id: req.params.id, clinicId: req.clinicId })
      .populate('patientId', 'name phone email address')
      .populate('clinicId');
    if (!inv) return res.status(404).json({ error: 'Not found' });
    const c = inv.clinicId;
    res.json({
      ...toClient(inv),
      clinic_name:    c?.name,
      clinic_address: c?.address,
      clinic_phone:   c?.phone,
      clinic_email:   c?.email,
      clinic_gst:     c?.gstNumber,
      clinic_tagline: c?.tagline,
      currency:       c?.currency || 'INR',
    });
  } catch (err) { console.error('[invoices]', err.message); res.status(500).json({ error: err.message || 'Failed' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const inv = await Invoice.findOne({ _id: req.params.id, clinicId: req.clinicId }).populate('patientId', 'name phone');
    if (!inv) return res.status(404).json({ error: 'Not found' });
    res.json(toClient(inv));
  } catch (err) { console.error('[invoices]', err.message); res.status(500).json({ error: err.message || 'Failed' }); }
});

router.post('/', async (req, res) => {
  try {
    const {
      patient_id, appointment_id, issue_date, due_date, notes,
      discount = 0, tax_rate = 18, payment_method, items = [],
    } = req.body;

    if (!patient_id)   return res.status(400).json({ error: 'Patient required' });
    if (!items.length) return res.status(400).json({ error: 'At least one item required' });
    if (items.some(i => !i.description || !i.description.trim())) {
      return res.status(400).json({ error: 'All items must have a description' });
    }

    const mappedItems = items.map(i => {
      const qty   = parseFloat(i.quantity)   || 1;
      const price = parseFloat(i.unit_price) || 0;
      return {
        description: i.description.trim(),
        category:    i.category || 'service',
        quantity:    qty,
        unitPrice:   price,
        amount:      parseFloat((qty * price).toFixed(2)),
      };
    });

    const discountNum = parseFloat(discount) || 0;
    const taxRateNum  = parseFloat(tax_rate) || 18;
    const { subtotal, taxAmount, total } = calcTotals(mappedItems, taxRateNum, discountNum);
    const invoiceNumber = await genInvoiceNumber(req.clinicId);

    const inv = await Invoice.create({
      clinicId:      req.clinicId,
      patientId:     patient_id,
      appointmentId: appointment_id || undefined,
      invoiceNumber,
      issueDate:     issue_date || new Date().toISOString().split('T')[0],
      dueDate:       due_date   || undefined,
      notes:         notes      || '',
      discount:      discountNum,
      taxRate:       taxRateNum,
      paymentMethod: payment_method || undefined,
      items:         mappedItems,
      subtotal, taxAmount, total,
    });

    res.status(201).json({
      message: 'Created', id: inv.id,
      invoice_number: invoiceNumber, subtotal, taxAmount, total,
    });
  } catch (err) {
    console.error('[invoices POST]', err.message, err.errors || '');
    res.status(500).json({ error: err.message || 'Failed to create invoice' });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    const { status, payment_method } = req.body;
    if (!['draft','sent','paid','cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const update = { status };
    if (payment_method) update.paymentMethod = payment_method;
    if (status === 'paid') update.paidAt = new Date();
    const inv = await Invoice.findOneAndUpdate({ _id: req.params.id, clinicId: req.clinicId }, { $set: update }, { new: true });
    if (!inv) return res.status(404).json({ error: 'Not found' });
    res.json({ message: `Invoice ${status}`, id: inv.id });
  } catch (err) { console.error('[invoices]', err.message); res.status(500).json({ error: err.message || 'Failed' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const inv = await Invoice.findOne({ _id: req.params.id, clinicId: req.clinicId });
    if (!inv) return res.status(404).json({ error: 'Not found' });
    if (inv.status === 'paid') return res.status(400).json({ error: 'Cannot edit paid invoice' });

    const { issue_date, due_date, notes, discount, tax_rate, items } = req.body;
    if (issue_date)          inv.issueDate = issue_date;
    if (due_date !== undefined) inv.dueDate = due_date;
    if (notes !== undefined)    inv.notes   = notes;
    if (discount !== undefined) inv.discount = discount;
    if (tax_rate !== undefined) inv.taxRate  = tax_rate;

    if (items && items.length) {
      inv.items = items.map(i => {
        const qty   = parseFloat(i.quantity)   || 1;
        const price = parseFloat(i.unit_price) || 0;
        return {
          description: (i.description || '').trim(),
          category:    i.category || 'service',
          quantity:    qty,
          unitPrice:   price,
          amount:      parseFloat((qty * price).toFixed(2)),
        };
      });
    }

    const { subtotal, taxAmount, total } = calcTotals(inv.items, inv.taxRate, inv.discount);
    inv.subtotal = subtotal; inv.taxAmount = taxAmount; inv.total = total;
    await inv.save();
    res.json({ message: 'Updated', id: inv.id });
  } catch (err) {
    console.error('[invoices PUT]', err.message, err.errors || '');
    res.status(500).json({ error: err.message || 'Failed to update invoice' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const inv = await Invoice.findOne({ _id: req.params.id, clinicId: req.clinicId });
    if (!inv) return res.status(404).json({ error: 'Not found' });
    if (inv.status === 'paid') return res.status(400).json({ error: 'Cannot delete paid invoice' });
    await inv.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) { console.error('[invoices]', err.message); res.status(500).json({ error: err.message || 'Failed' }); }
});

module.exports = router;
