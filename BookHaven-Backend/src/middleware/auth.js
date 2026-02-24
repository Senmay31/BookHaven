const { verifyAccessToken } = require('../utils/jwt');
const { query } = require('../config/database');

/**
 * Authenticate middleware
 * Like a security guard checking your library card at the entrance
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    // Fetch fresh user data from DB to ensure account is still active
    const result = await query(
      `SELECT id, name, email, role, avatar_url, is_active FROM users WHERE id = $1`,
      [decoded.id]
    );

    if (!result.rows[0] || !result.rows[0].is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account not found or has been deactivated.',
      });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please refresh your session.',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
    });
  }
};

/**
 * Optional auth — attaches user if token present, but doesn't block if not
 * Like a browsing area that's open to all but has personalized features for members
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyAccessToken(token);
      const result = await query(
        `SELECT id, name, email, role, avatar_url FROM users WHERE id = $1 AND is_active = true`,
        [decoded.id]
      );
      req.user = result.rows[0] || null;
    }
  } catch {
    req.user = null;
  }
  next();
};

/**
 * Authorize by role — like different access levels in the library
 * 'admin' can do everything, 'librarian' can manage books, 'reader' can only read
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to perform this action.',
      });
    }
    next();
  };
};

module.exports = { authenticate, optionalAuthenticate, authorize };
