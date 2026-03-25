const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Clinic, OtpCode } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenantMiddleware');

// ── Helper: escape regex special characters ───────────────────────────
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const user   = await User.findOne({ username });
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
    const clinic = await Clinic.findById(user.clinicId);
    if (!clinic) return res.status(403).json({ error: 'Clinic not found' });
    if (clinic.isActive === false) return res.status(403).json({ error: 'Clinic is inactive. Contact your administrator.' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id:          user.id,
        username:    user.username,
        email:       user.email,
        role:        user.role,
        clinic_id:   clinic.id,
        clinic_name: clinic.name,
        clinic_slug: clinic.slug,
        specialty: clinic.specialty || 'general',
      }
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Login failed' }); }
});

router.post('/register', verifyToken, resolveTenant, async (req, res) => {
  try {
    const { username, password, email, role = 'staff' } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (await User.findOne({ username })) return res.status(409).json({ error: 'Username already taken' });
    const user = await User.create({ clinicId: req.clinicId, username, password: bcrypt.hashSync(password, 10), email, role });
    res.status(201).json({ message: 'User created', id: user.id });
  } catch (err) { res.status(500).json({ error: 'Registration failed' }); }
});

router.get('/me', verifyToken, resolveTenant, (req, res) => res.json({ user: req.user, clinic: req.clinic }));


// ── OTP Login ──────────────────────────────────────────────────────────────

// Generate and "send" OTP — returns a WhatsApp link the frontend opens
router.post('/otp/generate', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) return res.status(400).json({ error: 'Invalid phone number' });

    // Use escaped regex + exact 10-digit suffix match
    const escapedDigits = escapeRegex(digits.slice(-10));
    const user = await User.findOne({ phone: { $regex: `${escapedDigits}$` } });
    if (!user) return res.status(404).json({ error: 'No account found with this phone number' });

    // Invalidate previous OTPs
    await OtpCode.updateMany({ phone: digits, used: false }, { $set: { used: true } });

    // Generate 6-digit OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OtpCode.create({ phone: digits, clinicId: user.clinicId, code, expiresAt });

    // In production, OTP should be delivered server-side only (not exposed in response)
    const isProd = process.env.NODE_ENV === 'production';
    const cleaned = digits.length === 10 ? `91${digits}` : digits;

    if (isProd) {
      // In production, only confirm OTP was sent — never leak the code
      res.json({ message: 'OTP sent to your WhatsApp', phone: digits, expiresIn: 600 });
    } else {
      // Dev mode: return wa.me link for manual testing
      const message = `Your Medical CRM login OTP is: *${code}*\n\nValid for 10 minutes. Do not share with anyone.`;
      const waLink = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
      res.json({ message: 'OTP generated', waLink, phone: digits, expiresIn: 600 });
    }
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to generate OTP' }); }
});

// Verify OTP and return token
router.post('/otp/verify', async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: 'Phone and OTP required' });

    const digits = phone.replace(/\D/g, '');
    const otp = await OtpCode.findOne({ phone: digits, code, used: false, expiresAt: { $gt: new Date() } });
    if (!otp) return res.status(401).json({ error: 'Invalid or expired OTP' });

    // Mark used
    otp.used = true;
    await otp.save();

    const escapedDigits = escapeRegex(digits.slice(-10));
    const user = await User.findOne({ phone: { $regex: `${escapedDigits}$` } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const clinic = await Clinic.findById(user.clinicId);
    if (!clinic || clinic.isActive === false) return res.status(403).json({ error: 'Clinic inactive' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, clinic_id: clinic.id, clinic_name: clinic.name, clinic_slug: clinic.slug, specialty: clinic.specialty || 'general' } });
  } catch (err) { res.status(500).json({ error: 'OTP verification failed' }); }
});

module.exports = router;
