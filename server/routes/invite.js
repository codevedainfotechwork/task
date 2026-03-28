const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

// ─── VALIDATE INVITE TOKEN (Public) ──────────────────────────────
// GET /api/invite/:token
router.get('/:token', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, email, name, role, password, inviteExpiry, inviteToken FROM users WHERE inviteToken = ?',
      [req.params.token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ valid: false, message: 'Invalid or expired invite link.' });
    }

    const user = rows[0];

    // Check expiry
    if (new Date(user.inviteExpiry) < new Date()) {
      return res.status(410).json({ valid: false, message: 'Invite link has expired. Please contact your administrator.' });
    }

    // Already activated (password was set — invite used)
    if (user.password) {
      return res.status(409).json({ valid: false, message: 'This invite has already been used.' });
    }

    res.json({
      valid: true,
      email: user.email,
      name: user.name,
      role: user.role
    });
  } catch (error) {
    console.error('Invite validation error:', error);
    res.status(500).json({ valid: false, message: 'Server error during validation.' });
  }
});

// ─── ACCEPT INVITE & SET PASSWORD (Public) ───────────────────────
// POST /api/invite/:token/accept
router.post('/:token/accept', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const [rows] = await pool.execute(
      'SELECT id, email, name, role, password AS existingPw, inviteExpiry, inviteToken FROM users WHERE inviteToken = ?',
      [req.params.token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Invalid invite link.' });
    }

    const user = rows[0];

    // Check expiry
    if (new Date(user.inviteExpiry) < new Date()) {
      return res.status(410).json({ message: 'Invite link has expired. Contact your administrator for a new invite.' });
    }

    // Already used
    if (user.existingPw) {
      return res.status(409).json({ message: 'This invite has already been used.' });
    }

    // Hash password and activate account
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await pool.execute(
      'UPDATE users SET password = ?, isActive = TRUE, inviteToken = NULL, inviteExpiry = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    res.json({
      message: 'Account activated successfully! You can now log in.',
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error('Invite accept error:', error);
    res.status(500).json({ message: 'Server error during account activation.' });
  }
});

module.exports = router;
