const { pool } = require('../config/db');

async function createSettingsTable() {
  try {
    const [rows] = await pool.query("SHOW TABLES LIKE 'settings'");
    if (rows.length === 0) {
      await pool.query(`
        CREATE TABLE settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          companyName VARCHAR(255) NOT NULL DEFAULT 'TASKFLOW',
          logoDataUrl LONGTEXT NULL,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('Settings table created.');
      
      // Insert default row
      await pool.query("INSERT INTO settings (companyName, logoDataUrl) VALUES ('TASKFLOW', NULL)");
      console.log('Default settings inserted.');
    } else {
      console.log('Settings table already exists.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error creating settings table:', err);
    process.exit(1);
  }
}

createSettingsTable();
