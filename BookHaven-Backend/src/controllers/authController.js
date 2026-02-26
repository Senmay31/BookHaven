const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const { query } = require('../config/database');
const {
  generateTokenPair,
  verifyRefreshToken,
  validateStoredRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  generateAccessToken,
} = require('../utils/jwt');

// ─── VALIDATION RULES ───
exports.registerValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be 8+ chars with uppercase, lowercase, and a number'),
];

exports.loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

// ─── REGISTER ───
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if email already exists
    const existing = await query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (name, email, password) VALUES ($1, $2, $3)
       RETURNING id, name, email, role, avatar_url, created_at`,
      [name, email, hashedPassword]
    );

    const user = result.rows[0];
    const { accessToken, refreshToken } = await generateTokenPair(user);

    // Update last login
    await query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [user.id]);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      data: { user, accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

// ─── LOGIN ───
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      `SELECT id, name, email, password, role, avatar_url, is_active FROM users
       WHERE email = $1 AND provider = 'local'`,
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      // Use generic message to prevent email enumeration attacks
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account has been deactivated.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const { password: _, ...safeUser } = user;
    const { accessToken, refreshToken } = await generateTokenPair(safeUser);

    await query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [user.id]);

    res.json({
      success: true,
      message: 'Login successful!',
      data: { user: safeUser, accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

// ─── REFRESH TOKEN ───
exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required.' });
    }

    // Verify the token is cryptographically valid
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    // Also check it exists in the DB (handles revoked tokens)
    const stored = await validateStoredRefreshToken(refreshToken);
    if (!stored) {
      return res.status(401).json({ success: false, message: 'Refresh token has been revoked.' });
    }

    // Rotate the refresh token for security (rolling refresh tokens)
    await revokeRefreshToken(refreshToken);

    const userResult = await query(
      `SELECT id, name, email, role, avatar_url FROM users WHERE id = $1`,
      [decoded.id]
    );

    const user = userResult.rows[0];
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await generateTokenPair(user);

    res.json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    next(error);
  }
};

// ─── LOGOUT ───
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await revokeRefreshToken(refreshToken);

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─── LOGOUT ALL DEVICES ───
exports.logoutAll = async (req, res, next) => {
  try {
    await revokeAllUserTokens(req.user.id);
    res.json({ success: true, message: 'Logged out from all devices.' });
  } catch (error) {
    next(error);
  }
};

// ─── GET ME ───
exports.getMe = async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
};

// ─── UPDATE PROFILE ───
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, avatar_url } = req.body;
    const result = await query(
      `UPDATE users SET name = COALESCE($1, name), avatar_url = COALESCE($2, avatar_url)
       WHERE id = $3 RETURNING id, name, email, role, avatar_url`,
      [name, avatar_url, req.user.id]
    );
    res.json({ success: true, data: { user: result.rows[0] } });
  } catch (error) {
    next(error);
  }
};
