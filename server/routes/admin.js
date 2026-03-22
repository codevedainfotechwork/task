const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const sanitized = { ...user };
  delete sanitized.password;
  return sanitized;
}

// GET /api/admin/user/:id/tasks
router.get('/user/:id/tasks', auth, requireRole('admin'), async (req, res) => {
  try {
    const userId = req.params.id;
    const tasks = await Task.find({ assignedTo: userId });
    
    // Return empty array if no tasks, but ensure it's not an error response
    res.json(tasks || []);
  } catch (error) {
    console.error('Error fetching user tasks for admin:', error);
    res.status(500).json({ message: 'Internal server error while retrieving user tasks.' });
  }
});

// PUT /api/admin/reset-password/:id
router.put('/reset-password/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const { newPassword } = req.body || {};

    if (typeof newPassword !== 'string' || newPassword.trim().length === 0) {
      return res.status(400).json({ message: 'New password is required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    const targetUser = await User.findById(req.params.id).select('+password');

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    const updatedUser = await User.updateById(targetUser._id, { password: hashedPassword });

    res.json({
      message: 'Password reset successfully.',
      user: sanitizeUser(updatedUser),
    });
  } catch (error) {
    console.error('Admin reset password error:', error);
    res.status(500).json({ message: 'Server error resetting password.' });
  }
});

module.exports = router;
