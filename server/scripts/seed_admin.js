const bcrypt = require('bcryptjs');
const Department = require('../models/Department');
const User = require('../models/User');

async function seed() {
  try {
    console.log('[SEED] Starting Admin Seed...');
    // Create Default Departments
    const depts = ['Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Legal'];
    for (const name of depts) {
      await Department.create({ name });
      console.log(`[SEED] Created department: ${name}`);
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
    console.log('[SEED] Admin Shuti Seeded Successfully!');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
seed();
