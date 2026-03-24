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
    // Try standard connection string (no +srv) to bypass local DNS issues
    // Note: Atlas often requires the SRV or all nodes, but sometimes the main domain works.
    const uri = "mongodb://codevedainfotechwork_db_user:HRGtcAHUKdR0vJye@codeveda-shard-00-00.x5f0ptj.mongodb.net:27017,codeveda-shard-00-01.x5f0ptj.mongodb.net:27017,codeveda-shard-00-02.x5f0ptj.mongodb.net:27017/task_manager?ssl=true&replicaSet=atlas-ib05z5-shard-0&authSource=admin&retryWrites=true&w=majority";
    
    console.log('Connecting to MongoDB via Standard String...');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log('Connected successfully!');

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

    console.log('\nDatabase Setup Complete!');
    process.exit(0);
  } catch (error) {
    console.error('Setup Error:', error);
    process.exit(1);
  }
}

resetDB();
