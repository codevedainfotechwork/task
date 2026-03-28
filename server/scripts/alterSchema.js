const { connectDB, pool } = require('../config/db');
const { ensureCoreSchema } = require('../config/schema');

async function checkAndAlterSchema() {
  try {
    await connectDB();
    await ensureCoreSchema(pool);
    console.log('Supabase schema verified and updated.');
    process.exit(0);
  } catch (err) {
    console.error('Schema alter error:', err);
    process.exit(1);
  }
}

checkAndAlterSchema();
