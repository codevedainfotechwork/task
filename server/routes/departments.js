const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');

// Get all active departments
router.get('/departments', auth, async (req, res) => {
  try {
    const departments = await Department.findActive();
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ message: 'Server error fetching departments.' });
  }
});

async function createDepartment(req, res) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Department name is required.' });
    }

    const newDept = await Department.create({ name: name.trim() });
    res.status(201).json({ message: 'Department created successfully.', department: newDept });
  } catch (error) {
    if (error.message === 'Department name already exists') {
      return res.status(400).json({ message: 'A department with this name already exists.' });
    }
    console.error('Error creating department:', error);
    res.status(500).json({ message: 'Server error creating department.' });
  }
}

async function deleteDepartment(req, res) {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    if (department.isDeleted) {
      return res.status(400).json({ message: 'Department is already deleted.' });
    }

    await Department.deleteSafe(req.params.id);
    res.json({
      message: 'Department successfully deleted.',
      department: {
        ...department,
        isDeleted: true,
      },
    });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ message: 'Server error deleting department.' });
  }
}

// Create a new department
router.post('/admin/departments', auth, requireRole('admin'), createDepartment);
router.post('/admin/create-department', auth, requireRole('admin'), createDepartment);

// Safe delete a department
router.delete('/admin/departments/:id', auth, requireRole('admin'), deleteDepartment);
router.delete('/admin/delete-department/:id', auth, requireRole('admin'), deleteDepartment);

module.exports = router;
