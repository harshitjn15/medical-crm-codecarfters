const { User, Clinic } = require('../models');

const resolveTenant = async (req, res, next) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Auth required' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    const clinic = await Clinic.findOne({ _id: user.clinicId, isActive: true });
    if (!clinic) return res.status(403).json({ error: 'Clinic not found or inactive' });

    req.clinicId = clinic._id;
    req.clinic   = clinic.toJSON(); // toJSON gives id instead of _id
    req.userRole = user.role;
    next();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

const resolvePublicTenant = async (req, res, next) => {
  try {
    const slug   = req.query.clinic || req.headers['x-clinic-slug'] || 'default';
    const clinic = await Clinic.findOne({ slug, isActive: true });
    if (!clinic) return res.status(404).json({ error: 'Clinic not found' });
    req.clinicId = clinic._id;
    req.clinic   = clinic.toJSON();
    next();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

module.exports = { resolveTenant, resolvePublicTenant };
