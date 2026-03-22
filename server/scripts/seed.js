require('dotenv').config();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const Department = require('../models/Department');
const pool = require('../config/db');

async function seed() {
  try {
    await Department.ensureSchema();

    console.log('Connected to MySQL. Clearing existing data...');
    
    // Clear tables (order matters due to foreign keys)
    await pool.execute('DELETE FROM notifications');
    await pool.execute('DELETE FROM tasks');
    await pool.execute('DELETE FROM departments');
    
    // To delete all users when there are self-referencing foreign keys (createdBy, managerId),
    // we need to temporarily disable foreign key checks, delete, then re-enable.
    await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
    await pool.execute('DELETE FROM users');
    await pool.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log('Creating Departments...');
    const depts = ['Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Legal'];
    for (const d of depts) {
      await pool.execute('INSERT INTO departments (name) VALUES (?)', [d]);
    }

    console.log('Creating Admin...');
    const salt = await bcrypt.genSalt(10);
    const hashPw = await bcrypt.hash('password', salt);

    const admin = await User.create({
      name: 'Shruti Admin',
      email: 'shrutilathiya18@gmail.com',
      password: hashPw,
      role: 'admin',
      isActive: true,
      department: []
    });

    console.log('Creating Managers...');
    const manager1 = await User.create({
      name: 'Bob Manager',
      email: 'manager@demo.com',
      password: hashPw,
      role: 'manager',
      department: ['Engineering', 'Design'],
      createdBy: admin._id,
      isActive: true
    });

    const manager2 = await User.create({
      name: 'Sarah Manager',
      email: 'manager2@demo.com',
      password: hashPw,
      role: 'manager',
      department: ['Marketing', 'Sales'],
      createdBy: admin._id,
      isActive: true
    });

    console.log('Creating Employees...');
    const emp1 = await User.create({
      name: 'Alice Employee',
      email: 'employee@demo.com',
      password: hashPw,
      role: 'employee',
      department: ['Engineering'],
      createdBy: manager1._id,
      managerId: manager1._id,
      isActive: true
    });

    const emp2 = await User.create({
      name: 'Charlie Employee',
      email: 'charlie@demo.com',
      password: hashPw,
      role: 'employee',
      department: ['Design'],
      createdBy: manager1._id,
      managerId: manager1._id,
      isActive: true
    });

    console.log('Creating Tasks...');
    const t1 = await Task.create({
      title: 'Upgrade Database',
      description: 'Migrate to the new cluster structure.',
      assignedTo: emp1._id,
      assignedBy: manager1._id,
      department: 'Engineering',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], // +3 days
      priority: 'high',
      status: 'pending'
    });

    const t2 = await Task.create({
      title: 'Design Logo',
      description: 'Create 3 concepts for the new product.',
      assignedTo: emp2._id,
      assignedBy: manager1._id,
      department: 'Design',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], // -2 days (overdue)
      priority: 'medium',
      status: 'in-progress'
    });

    // Create a completed task 35 days ago to test CRON
    const oldDate = new Date(Date.now() - 86400000 * 40).toISOString().split('T')[0];
    const completedAtStr = new Date(Date.now() - 86400000 * 35).toISOString().slice(0, 19).replace('T', ' ');
    
    const [result] = await pool.execute(
      `INSERT INTO tasks (title, description, assignedTo, assignedBy, department, status, startDate, dueDate, priority, completedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'API Documentation', 'Document standard endpoints.',
        emp1._id, manager1._id, 'Engineering', 'completed',
        oldDate, oldDate, 'low', completedAtStr
      ]
    );

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
