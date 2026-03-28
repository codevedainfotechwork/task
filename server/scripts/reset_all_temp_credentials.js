require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { connectDB, pool } = require('../config/db');
const { ensureCoreSchema } = require('../config/schema');

function generateTempPassword(length = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function formatStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
}

async function resetAllTempCredentials() {
  await connectDB();
  await ensureCoreSchema(pool);

  const [users] = await pool.query(
    'SELECT id, email, name, role, isActive FROM users ORDER BY id ASC'
  );

  if (!users.length) {
    console.log('No users found. Nothing to reset.');
    return;
  }

  const credentials = [];

  for (const user of users) {
    const tempPassword = generateTempPassword(12);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await pool.query(
      'UPDATE users SET password = ?, isActive = TRUE WHERE id = ?',
      [hashedPassword, user.id]
    );

    credentials.push({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tempPassword,
    });
  }

  const outputDir = path.join(__dirname, '..', 'generated');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const stamp = formatStamp();
  const jsonPath = path.join(outputDir, `temp_credentials_${stamp}.json`);
  const csvPath = path.join(outputDir, `temp_credentials_${stamp}.csv`);

  fs.writeFileSync(jsonPath, JSON.stringify(credentials, null, 2), 'utf8');
  fs.writeFileSync(
    csvPath,
    [
      'id,email,name,role,tempPassword',
      ...credentials.map((row) =>
        [
          row.id,
          `"${String(row.email).replace(/"/g, '""')}"`,
          `"${String(row.name || '').replace(/"/g, '""')}"`,
          row.role,
          row.tempPassword,
        ].join(',')
      ),
    ].join('\n'),
    'utf8'
  );

  console.log(`Reset credentials for ${credentials.length} user(s).`);
  console.log(`JSON saved to: ${jsonPath}`);
  console.log(`CSV saved to: ${csvPath}`);
}

resetAllTempCredentials()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to reset credentials:', error);
    process.exit(1);
  });
