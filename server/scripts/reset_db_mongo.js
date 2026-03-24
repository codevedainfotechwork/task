require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const Department = require('../models/Department');
const ActivityLog = require('../models/ActivityLog');

async function resetDB() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/task_manager';
    console.log('Connecting to MongoDB:', uri.substring(0, 30) + '...');
    await mongoose.connect(uri);
    console.log('Connected successfully.');

    console.log('Clearing all collections...');
    await Promise.all([
      User.deleteMany({}),
      Task.deleteMany({}),
      Department.deleteMany({}),
      Notification.deleteMany({}),
      ActivityLog.deleteMany({})
    ]);
    console.log('All collections cleared.');

    console.log('Creating Default Departments...');
    const depts = ['image generate', 'Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Legal'];
    for (const name of depts) {
      await Department.create({ name });
      console.log(`- Created Department: ${name}`);
    }

    console.log('Creating Master Admin...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password', salt);
    
    const admin = await User.create({
      name: 'Shruti Admin',
      email: 'shrutilathiya18@gmail.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      department: []
    });
    console.log(`- Created Admin: ${admin.email} (Password: password)`);

    console.log('\nDatabase Reset and Maintenance Complete!');
    process.exit(0);
  } catch (error) {
    console.error('Reset Error Full:', error);
    process.exit(1);
  }
}

resetDB();
