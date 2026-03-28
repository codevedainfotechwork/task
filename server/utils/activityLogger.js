const ActivityLog = require('../models/ActivityLog');

const logActivity = async (userId, action, details = '', req = null) => {
  try {
    await ActivityLog.create({
      userId,
      action,
      details,
      ip: req ? req.ip || req.connection.remoteAddress : 'internal',
      userAgent: req ? req.headers['user-agent'] : null
    });
  } catch (err) {
    console.error('Failed to save activity log:', err);
  }
};

module.exports = { logActivity };
