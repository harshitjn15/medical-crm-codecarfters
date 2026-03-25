/**
 * middleware/asyncHandler.js
 * Wraps async route handlers to catch promise rejections
 * and forward them to the global error handler via next().
 *
 * Usage:
 *   const asyncHandler = require('../middleware/asyncHandler');
 *   router.get('/', asyncHandler(async (req, res) => { ... }));
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
