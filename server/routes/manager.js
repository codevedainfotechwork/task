const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Department = require('../models/Department');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');

// Helper to overlap departments
function departmentsOverlap(source = [], target = []) {
  return source.some((department) => target.includes(department));
}

// Helper to sanitize user
function sanitizeUser(user) {
  if (!user) return null;
  const sanitized = { ...user };
  delete sanitized.password;
  return sanitized;
}

async function getManagedEmployee(managerId, employeeId) {
  const employee = await User.findById(employeeId).select('+password');

  if (!employee || employee.role !== 'employee') {
    return null;
  }

  if (String(employee.managerId) !== String(managerId)) {
    return null;
  }

  return employee;
}

// GET /manager/employees
// Returns employees where managerId = current manager
router.get('/employees', auth, requireRole('manager', 'admin'), async (req, res) => {
  try {
    // Fetch employees assigned to this manager
    let employees = await User.find({ managerId: req.user._id, role: 'employee' });
    
    // Ensure they are within the manager's departments (extra security layer)
    employees = employees.filter((employee) => departmentsOverlap(employee.department, req.user.department || []));

    res.json(employees.map(sanitizeUser));
  } catch (error) {
    console.error('Get manager employees error:', error);
    res.status(500).json({ message: 'Server error fetching team members.' });
  }
});

// GET /manager/directory
// Returns all active departments with their active managers
router.get('/directory', auth, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const [departments, managers] = await Promise.all([
      Department.findActive(),
      User.find({ role: 'manager', isActive: true }),
    ]);

    const directory = departments.map((department) => {
      const departmentManagers = managers
        .filter((manager) => (manager.department || []).includes(department.name))
        .map((manager) => ({
          ...sanitizeUser(manager),
          isCurrentManager: String(manager._id) === String(req.user._id),
        }))
        .sort((left, right) => left.name.localeCompare(right.name));

      return {
        ...department,
        managers: departmentManagers,
      };
    });

    res.json(directory);
  } catch (error) {
    console.error('Get manager directory error:', error);
    res.status(500).json({ message: 'Server error fetching manager directory.' });
  }
});

// PATCH /manager/employee/:id/toggle-access
// Toggle active status for an employee owned by the logged-in manager
router.patch('/employee/:id/toggle-access', auth, requireRole('manager'), async (req, res) => {
  try {
    const employee = await getManagedEmployee(req.user._id, req.params.id);

    if (!employee) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const updatedEmployee = await User.updateById(employee._id, { isActive: !employee.isActive });

    res.json({
      message: `Employee ${updatedEmployee.isActive ? 'enabled' : 'disabled'} successfully.`,
      employee: sanitizeUser(updatedEmployee),
    });
  } catch (error) {
    console.error('Toggle manager employee access error:', error);
    res.status(500).json({ message: 'Server error updating employee access.' });
  }
});

module.exports = router;
