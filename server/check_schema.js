const { pool, connectDB } = require('./config/db');
require('dotenv').config();

async function checkSchema() {
  try {
    await connectDB();
    const [rows] = await pool.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_name = 'tasks'
       ORDER BY ordinal_position`
    );
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  }
}

checkSchema();
