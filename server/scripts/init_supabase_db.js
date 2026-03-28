require('dotenv').config();
const { connectDB, pool } = require('../config/db');
const { ensureCoreSchema } = require('../config/schema');
const { ensureLocalBootstrap } = require('../utils/localBootstrap');

async function initializeDB() {
  try {
    await connectDB();
    await ensureCoreSchema(pool);
    if (process.env.NODE_ENV !== 'production') {
      await ensureLocalBootstrap();
    }
    console.log('Supabase schema initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDB();
