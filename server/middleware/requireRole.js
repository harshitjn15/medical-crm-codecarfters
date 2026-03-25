/**
 * middleware/requireRole.js
 * Role-Based Access Control (RBAC) middleware.
 *
 * Usage:
 *   const { requireRole } = require('../middleware/requireRole');
 *   router.delete('/:id', requireRole('admin', 'super_admin'), handler);
 */

const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.userRole) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!allowedRoles.includes(req.userRole)) {
    return res.status(403).json({
      error: 'Insufficient permissions',
      required: allowedRoles,
      current: req.userRole,
    });
  }
  next();
};

module.exports = { requireRole };
