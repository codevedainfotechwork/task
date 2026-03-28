const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');
const { ensureSupabaseAdminUser, signInSupabaseAdmin } = require('../utils/supabaseAuth');
const { issueSessionTokenForUser } = require('../utils/sessionToken');

const HARDCODED_ADMIN_USERNAME = String(process.env.LOCAL_ADMIN_USERNAME || 'Denish').trim();
const HARDCODED_ADMIN_EMAIL = String(process.env.LOCAL_ADMIN_EMAIL || 'denish@example.com').trim();
const HARDCODED_ADMIN_PASSWORD = String(process.env.LOCAL_ADMIN_PASSWORD || 'Denish@5555');

// POST /api/auth/login
router.post('/login', [
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  console.log('Login request body:', req.body);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, username, password, portalRole } = req.body;
    const cleanUsername = String(username || email || '').trim();
    console.log(`[LOGIN ATTEMPT] Username: "${cleanUsername}", Role: ${portalRole}`);

    const wantsAdminPortal = String(portalRole || '').toLowerCase() === 'admin';

    if (wantsAdminPortal) {
      if (!cleanUsername) {
        return res.status(400).json({ message: 'Username is required' });
      }

      let adminUser = await User.findOne({ username: cleanUsername }).select('+password');
      if (!adminUser) {
        adminUser = await User.findOne({ email: cleanUsername }).select('+password');
      }

      if (!adminUser) {
        await logActivity(null, 'LOGIN_FAIL', `Admin user not found: ${cleanUsername}`, req);
        return res.status(404).json({ error: 'user_not_found', message: 'Invalid credentials. User not found.' });
      }

      if (adminUser && adminUser.role !== 'admin') {
        return res.status(403).json({ error: 'role_mismatch', message: 'Access denied. This account is not an admin account.' });
      }

      if (!adminUser.isActive) {
        return res.status(403).json({ error: 'account_disabled', message: 'Account disabled. Contact administrator.' });
      }

      const isBootstrapAdmin =
        adminUser.username?.toLowerCase() === HARDCODED_ADMIN_USERNAME.toLowerCase() ||
        adminUser.email?.toLowerCase() === HARDCODED_ADMIN_EMAIL.toLowerCase();

      if (isBootstrapAdmin) {
        try {
          await ensureSupabaseAdminUser({
            email: adminUser.email || HARDCODED_ADMIN_EMAIL,
            password: HARDCODED_ADMIN_PASSWORD,
            name: adminUser.name || HARDCODED_ADMIN_USERNAME,
            username: adminUser.username || HARDCODED_ADMIN_USERNAME,
            role: 'admin',
          });
        } catch (error) {
          console.warn(`Supabase Auth sync skipped during admin login bootstrap: ${error.message}`);
        }
      }

      try {
        await signInSupabaseAdmin({
          email: adminUser.email || cleanUsername,
          password,
        });
      } catch (supabaseError) {
        const supabaseStatus = supabaseError.status || 401;
        const supabaseCode = supabaseError.code || 'supabase_auth_error';
        const supabaseMessage = supabaseError.message || 'Invalid credentials.';

        console.error('Supabase admin auth error:', {
          status: supabaseStatus,
          code: supabaseCode,
          message: supabaseMessage,
          email: adminUser.email || cleanUsername,
        });

        const localPasswordMatches = await bcrypt.compare(password, adminUser.password || '');
        if (!localPasswordMatches) {
          await logActivity(adminUser._id, 'LOGIN_FAIL', `Supabase admin auth rejected credentials (${supabaseCode})`, req);
          return res.status(supabaseStatus).json({
            error: supabaseCode,
            message: supabaseMessage,
          });
        }

        console.warn('Falling back to local admin password check because Supabase Auth rejected the login.');
      }

      const { token } = await issueSessionTokenForUser(adminUser._id);

      const safeUser = adminUser.toObject();
      delete safeUser.password;
      safeUser.role = 'admin';

      await logActivity(adminUser._id, 'LOGIN_SUCCESS', `Admin login into ${portalRole || 'admin'} portal`, req);

      return res.json({
        token,
        user: safeUser
      });
    }

    if (!cleanUsername) {
      return res.status(400).json({ message: 'Username is required' });
    }

    // Standard manager/employee login: strict username + password matching.
    let user = await User.findOne({ username: cleanUsername }).select('+password');
    if (!user) {
      user = await User.findOne({ email: cleanUsername }).select('+password');
    }
    console.log(`[LOGIN RESULT] User object:`, user ? user.email : 'NULL');

    if (!user) {
      await logActivity(null, 'LOGIN_FAIL', `User not found: ${cleanUsername}`, req);
      return res.status(404).json({ error: 'user_not_found', message: 'Invalid credentials. User not found.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'account_disabled', message: 'Account disabled. Contact administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await logActivity(user._id, 'LOGIN_FAIL', 'Incorrect password', req);
      return res.status(401).json({ error: 'invalid_password', message: 'Invalid credentials. Incorrect password.' });
    }

    if (portalRole && user.role !== portalRole) {
      return res.status(403).json({ error: 'role_mismatch', message: `Access denied. Registered as ${user.role}, but attempting to access ${portalRole} portal.` });
    }

    const { token } = await issueSessionTokenForUser(user._id);

    // Strip password before sending response
    const safeUser = user.toObject();
    delete safeUser.password;

    // Log success
    await logActivity(user._id, 'LOGIN_SUCCESS', `Logged into ${portalRole || user.role} portal`, req);

    res.json({
      token,
      user: safeUser
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login', details: error.message });
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
