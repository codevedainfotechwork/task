require('dotenv').config();
const pool = require('../config/db');

async function fix() {
  try {
    console.log('Altering tasks table schema...');
    await pool.execute('ALTER TABLE tasks MODIFY COLUMN status VARCHAR(20) DEFAULT "Pending"');
    console.log('  status -> VARCHAR(20) OK');
    await pool.execute('ALTER TABLE tasks MODIFY COLUMN priority VARCHAR(10) DEFAULT "Medium"');
    console.log('  priority -> VARCHAR(10) OK');
    console.log('Schema updated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Schema update error:', err.message);
    process.exit(1);
  }
}

fix();
