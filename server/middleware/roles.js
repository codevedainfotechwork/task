// Middleware to check if user has one of the required roles
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const userRole = String(req.user.role || '').toLowerCase();
    const allowedRoles = roles.map(r => String(r).toLowerCase());

    console.log(`[AUTH] Checking role: "${userRole}" against required: [${allowedRoles.join(', ')}]`);
    
    if (!allowedRoles.includes(userRole)) {
      console.warn(`[AUTH] Access Denied for role: "${userRole}"`);
      return res.status(403).json({ 
        message: `Access denied. Requires one of roles: ${roles.join(', ')}` 
      });
    }

    next();
  };
};

module.exports = requireRole;
