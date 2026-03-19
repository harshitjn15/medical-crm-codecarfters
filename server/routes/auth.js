const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Clinic } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenantMiddleware');

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
      process.env.JWT_SECRET || 'default-secret',
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

module.exports = router;
