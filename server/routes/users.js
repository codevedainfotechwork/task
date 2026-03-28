const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const { writeAdminAccessFile } = require('../utils/adminAccessFile');
const { ensureSupabaseAdminUser } = require('../utils/supabaseAuth');

const router = express.Router();

function normalizeDepartments(input) {
  const departments = User.normalizeDepartments(input);
  return [...new Set(departments)];
}

function departmentsOverlap(source = [], target = []) {
  return source.some((department) => target.includes(department));
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const sanitized = user.toObject();
  delete sanitized.password;
  return sanitized;
}

async function getScopedEmployeeForManager(manager, userId) {
  const employee = await User.findById(userId).select('+password');

  if (!employee || employee.role !== 'employee') {
    return null;
  }

  if (String(employee.managerId) !== String(manager._id)) {
    return null;
  }

  if (!departmentsOverlap(employee.department, manager.department || [])) {
    return null;
  }

  return employee;
}

router.post('/', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, username, password, role, department, managerId } = req.body;
    const loginId = String(username || '').trim();
    const requestedRole = req.user.role === 'manager' ? 'employee' : String(role || '').toLowerCase();
    const managerDepartment = req.user.role === 'manager'
      ? normalizeDepartments(req.user.department || [])[0]
      : null;
    const departments = requestedRole === 'admin'
      ? []
      : req.user.role === 'manager'
        ? normalizeDepartments(managerDepartment ? [managerDepartment] : [])
        : normalizeDepartments(department);

    if (!name || !loginId || !password) {
      return res.status(400).json({ message: 'Name, username, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    if (!['admin', 'manager', 'employee'].includes(requestedRole)) {
      return res.status(400).json({ message: 'Invalid role supplied.' });
    }

    if (requestedRole !== 'admin' && departments.length === 0) {
      return res.status(400).json({ message: 'At least one department is required.' });
    }

    if (req.user.role === 'manager' && departments.length !== 1) {
      return res.status(400).json({ message: 'Managers must assign exactly one department per employee.' });
    }

    const existingUser = await User.findOne({ email: loginId }).select('+password');
    if (existingUser) {
      return res.status(400).json({ message: 'Username already in use.' });
    }

    let assignedManagerId = null;

    if (req.user.role === 'manager') {
      const managerDepartments = req.user.department || [];

      if (!departments.every((dept) => managerDepartments.includes(dept))) {
        return res.status(403).json({ message: 'Managers can only create employees inside their assigned departments.' });
      }

      assignedManagerId = req.user._id;
    } else if (requestedRole === 'employee') {
      if (!managerId) {
        return res.status(400).json({ message: 'A manager is required when creating an employee.' });
      }

      const manager = await User.findById(managerId).select('+password');

      if (!manager || manager.role !== 'manager') {
        return res.status(400).json({ message: 'Selected manager was not found.' });
      }

      if (!departments.every((dept) => manager.department.includes(dept))) {
        return res.status(400).json({ message: 'Employee departments must be inside the assigned manager departments.' });
      }

      assignedManagerId = manager._id;
    } else if (requestedRole === 'admin') {
      assignedManagerId = null;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const adminAccessSeed = requestedRole === 'admin' ? crypto.randomBytes(16).toString('hex') : null;
    const adminAccessArtifact = requestedRole === 'admin'
      ? await writeAdminAccessFile({
          username: loginId,
          name: String(name).trim(),
          userId: 'pending',
          seed: adminAccessSeed,
          issuedAt: new Date().toISOString(),
        })
      : null;

    const createdUser = await User.create({
      name: String(name).trim(),
      username: loginId,
      email: loginId,
      password: hashedPassword,
      role: requestedRole,
      department: departments,
      createdBy: req.user._id,
      managerId: assignedManagerId,
      isActive: true,
      adminAccessSeed,
      adminAccessFileHash: adminAccessArtifact?.hash || null,
      adminAccessFileName: adminAccessArtifact?.fileName || null,
      adminAccessIssuedAt: adminAccessArtifact?.issuedAt || null,
    });

    if (requestedRole === 'admin') {
      try {
        await ensureSupabaseAdminUser({
          email: createdUser.email,
          password,
          name: createdUser.name,
          username: createdUser.username,
          role: 'admin',
        });
      } catch (syncError) {
        console.warn(`Supabase Auth sync skipped for created admin ${createdUser.username}: ${syncError.message}`);
      }
    }

    res.status(201).json({
      message: `${requestedRole === 'employee' ? 'Employee' : requestedRole === 'admin' ? 'Admin' : 'Manager'} created successfully.`,
      user: sanitizeUser(createdUser),
      accessFile: adminAccessArtifact ? {
        fileName: adminAccessArtifact.fileName,
        content: adminAccessArtifact.content,
      } : null,
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error creating user.' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const departmentFilter = req.query.department ? String(req.query.department).trim() : null;

    if (req.user.role === 'admin') {
      const users = await User.find();
      return res.json(users.map(sanitizeUser));
    }

    if (req.user.role === 'manager') {
      let employees = await User.find({ managerId: req.user._id, role: 'employee' });
      employees = employees.filter((employee) => departmentsOverlap(employee.department, req.user.department || []));

      if (departmentFilter) {
        employees = employees.filter((employee) => employee.department.includes(departmentFilter));
      }

      return res.json(employees.map(sanitizeUser));
    }

    const currentUser = await User.findById(req.user._id);
    return res.json(currentUser ? [sanitizeUser(currentUser)] : []);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error fetching users.' });
  }
});

router.get('/managers', auth, requireRole('admin'), async (_req, res) => {
  try {
    const managers = await User.find({ role: 'manager', isActive: true });
    res.json(managers.map(sanitizeUser));
  } catch (error) {
    console.error('Get managers error:', error);
    res.status(500).json({ message: 'Server error fetching managers.' });
  }
});

router.patch('/:id/toggle', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id).select('+password');

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (req.user.role === 'manager') {
      const scopedEmployee = await getScopedEmployeeForManager(req.user, req.params.id);

      if (!scopedEmployee) {
        return res.status(403).json({ message: 'Managers can only change access for their own department employees.' });
      }
    } else if (targetUser.role === 'admin') {
      return res.status(403).json({ message: 'Admin accounts cannot be toggled here.' });
    }

    const requestedStatus = req.body && typeof req.body.isActive === 'boolean'
      ? req.body.isActive
      : undefined;
    const nextStatus = requestedStatus ?? !targetUser.isActive;
    const updatedUser = await User.updateById(targetUser._id, { isActive: nextStatus });

    if (!updatedUser) {
      return res.status(500).json({ message: 'User could not be updated.' });
    }

    const roleLabel = updatedUser.role === 'manager'
      ? 'Manager'
      : updatedUser.role === 'employee'
        ? 'Employee'
        : 'User';

    res.json({
      message: `${roleLabel} ${nextStatus ? 'enabled' : 'disabled'} successfully.`,
      user: sanitizeUser(updatedUser),
    });
  } catch (error) {
    console.error('Toggle user error:', error);
    res.status(500).json({ message: 'Server error updating user access.' });
  }
});

router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error deleting user.' });
  }
});

router.get('/:id/tasks', auth, requireRole('admin'), async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id).select('_id role');

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    let query;
    if (targetUser.role === 'manager') {
      query = {
        $or: [
          { assignedTo: req.params.id },
          { assignedBy: req.params.id },
        ],
      };
    } else if (targetUser.role === 'admin') {
      query = { assignedBy: req.params.id };
    } else {
      query = { assignedTo: req.params.id };
    }

    const tasks = await Task.find(query);
    tasks.sort((left, right) => Number(right.id || right._id || 0) - Number(left.id || left._id || 0));
    res.json(tasks);
  } catch (error) {
    console.error('Get user tasks error:', error);
    res.status(500).json({ message: 'Server error fetching user tasks.' });
  }
});

router.get('/admins', auth, requireRole('admin', 'manager'), async (_req, res) => {
  try {
    const admins = await User.find({ role: 'admin', isActive: true });
    res.json(admins.map(sanitizeUser));
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ message: 'Server error fetching admins.' });
  }
});

module.exports = router;
