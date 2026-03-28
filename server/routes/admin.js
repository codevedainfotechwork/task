const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const Department = require('../models/Department');
const Notification = require('../models/Notification');
const HelpRequest = require('../models/HelpRequest');
const ActivityLog = require('../models/ActivityLog');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const { verifyAdminAccessFile, readAdminAccessFile, createAdminAccessArtifact } = require('../utils/adminAccessFile');
const { ensureSupabaseAdminUser } = require('../utils/supabaseAuth');

const upload = multer({ storage: multer.memoryStorage() });

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const sanitized = user.toObject();
  delete sanitized.password;
  return sanitized;
}

// GET /api/admin/user/:id/tasks
router.get('/user/:id/tasks', auth, requireRole('admin'), async (req, res) => {
  try {
    const userId = req.params.id;
    const targetUser = await User.findById(userId).select('_id role');

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    let query;
    if (targetUser.role === 'manager') {
      query = {
        $or: [
          { assignedTo: userId },
          { assignedBy: userId },
        ],
      };
    } else if (targetUser.role === 'admin') {
      query = { assignedBy: userId };
    } else {
      query = { assignedTo: userId };
    }

    const tasks = await Task.find(query);
    tasks.sort((left, right) => Number(right.id || right._id || 0) - Number(left.id || left._id || 0));
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

    if (targetUser.role === 'admin') {
      try {
        await ensureSupabaseAdminUser({
          email: targetUser.email,
          password: newPassword,
          name: targetUser.name,
          username: targetUser.username,
          role: 'admin',
        });
      } catch (syncError) {
        console.warn(`Supabase Auth sync skipped for admin password reset ${targetUser.username}: ${syncError.message}`);
      }
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

// POST /api/admin/access-file/verify
router.post('/access-file/verify', auth, requireRole('admin'), upload.single('adminAuthFile'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer || !req.file.buffer.length) {
      return res.status(400).json({ error: 'missing_admin_file', message: 'Admin access file is required.' });
    }

    const currentUser = await User.findById(req.user._id).select('+password');

    if (!currentUser) {
      return res.status(404).json({ error: 'missing_admin_file_config', message: 'Admin access file is not configured for this account.' });
    }

    const expectedArtifact = createAdminAccessArtifact({
      username: currentUser.username || currentUser.email,
      name: currentUser.name,
      userId: currentUser._id,
      seed: currentUser.adminAccessSeed,
      issuedAt: currentUser.adminAccessIssuedAt,
    });
    const matches = await verifyAdminAccessFile(
      req.file.buffer,
      {
        username: currentUser.username || currentUser.email,
        name: currentUser.name,
        userId: currentUser._id,
        hash: currentUser.adminAccessFileHash,
      },
      expectedArtifact
    );
    if (!matches) {
      return res.status(403).json({ error: 'invalid_admin_file', message: 'Invalid admin access file.' });
    }

    const filePath = path.join(__dirname, '..', 'generated', 'admin-access', currentUser.adminAccessFileName || '');
    const fileContent = await readAdminAccessFile(filePath);

    res.json({
      message: 'Admin access file verified successfully.',
      fileName: currentUser.adminAccessFileName || null,
      fileContent,
    });
  } catch (error) {
    console.error('Admin access file verify error:', error);
    res.status(500).json({ message: 'Server error verifying admin access file.' });
  }
});

// Temporary Maintenance Endpoint: Purge and Reset DB
// GET /api/admin/purge-and-reset?key=YOUR_MAINTENANCE_SECRET_KEY
router.get('/purge-and-reset', async (req, res) => {
  try {
    const { key } = req.query;
    if (!key || key !== process.env.MAINTENANCE_SECRET_KEY) {
      return res.status(403).json({ message: 'Unauthorized. Invalid maintenance key.' });
    }

    console.log('[MAINTENANCE] Starting Database Purge and Reset...');

    // Clear all collections
    await Promise.all([
      User.deleteMany({}),
      Task.deleteMany({}),
      Department.deleteMany({}),
      Notification.deleteMany({}),
      HelpRequest.deleteMany({}),
      ActivityLog.deleteMany({})
    ]);

    // Create Default Departments
    const depts = ['image generate', 'Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Legal'];
    for (const name of depts) {
      await Department.create({ name });
    }

    // Create Fresh Admin
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password', salt);
    
    await User.create({
      name: 'Shruti Admin',
      email: 'shrutilathiya18@gmail.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      department: []
    });

    console.log('[MAINTENANCE] Database Purge and Reset Successful.');

    res.json({ 
      message: 'Database has been fully purged and re-initialized with a fresh Admin account.',
      admin: 'shrutilathiya18@gmail.com',
      password: 'password (default)',
      departmentsCount: depts.length
    });

  } catch (error) {
    console.error('Maintenance reset error:', error);
    res.status(500).json({ message: 'Critical error during database reset.', error: error.message });
  }
});

module.exports = router;
