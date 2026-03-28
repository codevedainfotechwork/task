require('dotenv').config();
const crypto = require('crypto');
const User = require('../models/User');
const { connectDB, pool } = require('../config/db');
const { ensureCoreSchema } = require('../config/schema');
const { writeAdminAccessFile } = require('../utils/adminAccessFile');

function getArg(name, fallback = '') {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) {
    return fallback;
  }
  return String(process.argv[index + 1] || fallback).trim();
}

async function main() {
  const identifier = getArg('--user', process.env.LOCAL_ADMIN_USERNAME || 'Denish');

  try {
    await connectDB();
    await ensureCoreSchema(pool);

    let user = await User.findOne({ username: identifier }).select('+password');
    if (!user) {
      user = await User.findOne({ email: identifier }).select('+password');
    }

    if (!user) {
      throw new Error(`Admin user not found for "${identifier}"`);
    }

    if (String(user.role || '').toLowerCase() !== 'admin') {
      throw new Error(`User "${identifier}" is not an admin account`);
    }

    const adminAccessSeed = user.adminAccessSeed || crypto.randomBytes(16).toString('hex');
    const adminAccessIssuedAt = user.adminAccessIssuedAt || new Date().toISOString();
    const artifact = await writeAdminAccessFile({
      username: user.username || user.email,
      name: user.name,
      userId: user._id,
      seed: adminAccessSeed,
      issuedAt: adminAccessIssuedAt,
    });

    await pool.query(
      `
        UPDATE users
        SET adminaccessseed = ?, adminaccessfilehash = ?, adminaccessfilename = ?, adminaccessissuedat = ?
        WHERE id = ?
      `,
      [adminAccessSeed, artifact.hash, artifact.fileName, artifact.issuedAt, user._id]
    );

    console.log('Admin access file generated successfully.');
    console.log(`User: ${user.username || user.email}`);
    console.log(`File: ${artifact.filePath}`);
    console.log(`Hash: ${artifact.hash}`);
    process.exit(0);
  } catch (error) {
    console.error('Admin access file generation failed:', error.message || error);
    process.exit(1);
  }
}

main();
