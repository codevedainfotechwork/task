const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(202).json({ error: 'unauthorized', message: 'Authentication required. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[AUTH] Token Decoded:', { id: decoded.id, role: decoded.role });
    const user = await User.findById(decoded.id);

    if (!user) {
      console.warn('[AUTH] User not found in DB for ID:', decoded.id);
      return res.status(202).json({ error: 'unauthorized', message: 'User not found. Invalid token.' });
    }
    console.log('[AUTH] User Fetched from DB:', { id: user._id, name: user.name, role: user.role });

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is disabled. Contact an administrator.' });
    }

    // Remove password from user object before attaching to request
    // Remove password from user object before attaching to request
    delete user.password;

    // Normalize role to avoid case-sensitivity issues (admin vs Admin)
    user.role = String(user.role || '').toLowerCase();

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    if (err.name === 'TokenExpiredError') {
      return res.status(202).json({ error: 'unauthorized', message: 'Session expired. Please log in again.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(202).json({ error: 'unauthorized', message: 'Invalid authentication token. Please log in again.' });
    }
    return res.status(202).json({ error: 'unauthorized', message: 'Authentication failed. Please log in again.' });
  }
};

module.exports = auth;
