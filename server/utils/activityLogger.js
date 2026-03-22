const ActivityLog = require('../models/ActivityLog');

const logActivity = async (userId, action, details = '', req = null) => {
  try {
    const log = new ActivityLog({
      userId,
      action,
      details,
      ip: req ? req.ip || req.connection.remoteAddress : 'internal'
    });
    await log.save();
  } catch (err) {
    console.error('Failed to save activity log:', err);
  }
};

module.exports = { logActivity };
