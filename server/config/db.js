const { Pool } = require('pg');
require('dotenv').config();

const connectionString =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!connectionString) {
  console.warn(
    'No Supabase/Postgres connection string found. Set SUPABASE_DB_URL or DATABASE_URL before starting the server.'
  );
}

const sslEnabled = String(process.env.SUPABASE_DB_SSL || '').toLowerCase() !== 'false';

const pgPool = new Pool({
  connectionString: connectionString || undefined,
  ssl: sslEnabled && process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: Number(process.env.DB_POOL_SIZE || 10),
});

function convertPlaceholders(sql) {
  let index = 0;
  return String(sql).replace(/\?/g, () => `$${++index}`);
}

function normalizeQuery(sql) {
  const trimmed = String(sql).trim().replace(/;$/, '');

  if (/^SET\s+FOREIGN_KEY_CHECKS\s*=\s*[01]$/i.test(trimmed)) {
    return { skip: true };
  }

  if (/^TRUNCATE\s+TABLE\s+/i.test(trimmed) && !/CASCADE/i.test(trimmed)) {
    return { sql: `${trimmed} RESTART IDENTITY CASCADE` };
  }

  if (/^INSERT\s+/i.test(trimmed) && !/RETURNING\s+/i.test(trimmed)) {
    return { sql: `${trimmed} RETURNING id` };
  }

  return { sql: trimmed };
}

function shapeResult(result, originalSql) {
  const command = String(result.command || '').toUpperCase();
  const selectLike = command === 'SELECT' || /^WITH\s+/i.test(String(originalSql).trim());

  if (selectLike) {
    return [result.rows, result.fields];
  }

  const insertId = result.rows && result.rows[0] && Object.prototype.hasOwnProperty.call(result.rows[0], 'id')
    ? result.rows[0].id
    : null;

  return [{
    insertId,
    affectedRows: typeof result.rowCount === 'number' ? result.rowCount : 0,
    rows: result.rows || [],
    command,
  }];
}

async function query(sql, params = []) {
  const normalized = normalizeQuery(sql);
  if (normalized.skip) {
    return [{ affectedRows: 0, insertId: null, rows: [] }, []];
  }

  const text = convertPlaceholders(normalized.sql);
  const result = await pgPool.query(text, params);
  return shapeResult(result, normalized.sql);
}

async function execute(sql, params = []) {
  return query(sql, params);
}

async function getConnection() {
  const client = await pgPool.connect();
  return {
    query: async (sql, params = []) => {
      const normalized = normalizeQuery(sql);
      if (normalized.skip) {
        return [{ affectedRows: 0, insertId: null, rows: [] }, []];
      }

      const text = convertPlaceholders(normalized.sql);
      const result = await client.query(text, params);
      return shapeResult(result, normalized.sql);
    },
    release: () => client.release(),
  };
}

const pool = {
  query,
  execute,
  getConnection,
};

const connectDB = async () => {
  try {
    const connection = await pgPool.connect();
    try {
      await connection.query('SELECT 1');
      console.log('Supabase Postgres connected');
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error(`Supabase Postgres Connection Error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = { pool, connectDB, pgPool };
