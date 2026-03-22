const pool = require('../config/db');

async function checkAndAlterSchema() {
  try {
    const conn = await pool.getConnection();
    console.log('Checking database schema...');

    // We need to add 'department' (JSON or TEXT) to users if it doesn't exist
    // and change IDs from INT to VARCHAR(36) to support UUIDs or string IDs easily from the frontend side
    // Or just keep INTs and handle that the frontend expects string IDs.
    // The previous Mongoose implementation used ObjectIds (24 char hex strings).
    // MySQL uses INT AUTO_INCREMENT by default in the schema we provided.
    // Let's stick to INT AUTO_INCREMENT and just let the frontend use int IDs, but convert to string where needed,
    // or we alter table. Adding department is required.
    
    try {
      await conn.execute('ALTER TABLE users ADD COLUMN department JSON AFTER role');
      console.log('Added department column to users table.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('Department column already exists.');
      } else {
        throw e;
      }
    }
    
    conn.release();
    process.exit(0);
  } catch (err) {
    console.error('Schema alter error:', err);
    process.exit(1);
  }
}

checkAndAlterSchema();
