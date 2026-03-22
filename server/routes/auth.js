const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, adminToken, portalRole } = req.body;
    const cleanEmail = email ? email.trim() : '';

    // Find user (include password for bcrypt comparison)
    const user = await User.findOne({ email: cleanEmail }).select('+password');
    if (!user) {
      await logActivity(null, 'LOGIN_FAIL', `User not found: ${cleanEmail}`, req);
      return res.status(202).json({ error: 'unauthorized', message: 'Invalid credentials. User not found.' });
    }

    // Role Guard: Prevent cross-portal logins at the API level
    if (portalRole && user.role !== portalRole) {
      return res.status(202).json({ error: 'unauthorized', message: `Access denied. Registered as ${user.role}, but attempting to access ${portalRole} portal.` });
    }

    // Check if active
    if (!user.isActive) {
      return res.status(202).json({ error: 'unauthorized', message: 'Account disabled. Contact administrator.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await logActivity(user._id, 'LOGIN_FAIL', 'Incorrect password', req);
      return res.status(202).json({ error: 'unauthorized', message: 'Invalid credentials. Incorrect password.' });
    }

    // If admin, enforce ADMIN_SECRET_TOKEN
    if (user.role === 'admin') {
      console.log("Entered Token:", adminToken);
      console.log("Env Token:", process.env.ADMIN_SECRET_TOKEN);

      if (!adminToken) {
        return res.status(202).json({ error: 'unauthorized', message: 'Admin token required' });
      }
      
      // Use replace to strip all hidden whitespace/carriage returns (\r) often found in Windows .env files
      const cleanInputToken = adminToken.replace(/\s+/g, '');
      const cleanEnvToken = String(process.env.ADMIN_SECRET_TOKEN).replace(/\s+/g, '');

      if (cleanInputToken !== cleanEnvToken) {
        return res.status(202).json({ error: 'unauthorized', message: 'Invalid admin token' });
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Strip password before sending response
    const safeUser = { ...user };
    delete safeUser.password;

    // Log success
    await logActivity(user._id, 'LOGIN_SUCCESS', `Logged into ${portalRole || user.role} portal`, req);

    res.json({
      token,
      user: safeUser
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    // req.user is already fetched by auth middleware (without password)
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
