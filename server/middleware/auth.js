const { findUserBySessionToken } = require('../utils/sessionToken');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(202).json({ error: 'unauthorized', message: 'Authentication required. No token provided.' });
    }

    const user = await findUserBySessionToken(token);

    if (!user) {
      return res.status(202).json({ error: 'unauthorized', message: 'User not found. Invalid session.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is disabled. Contact an administrator.' });
    }

    delete user.password;
    user.role = String(user.role || '').toLowerCase();

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(202).json({ error: 'unauthorized', message: 'Authentication failed. Please log in again.' });
  }
};

module.exports = auth;
