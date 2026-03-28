const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Department = require('../models/Department');
const Settings = require('../models/Settings');
const { pool } = require('../config/db');
const { writeAdminAccessFile } = require('./adminAccessFile');
const { ensureSupabaseAdminUser } = require('./supabaseAuth');

const DEFAULT_DEPARTMENTS = ['Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Legal'];

function clean(value, fallback) {
  return String(value || fallback || '').trim();
}

async function ensureLocalBootstrap() {
  const adminName = clean(process.env.LOCAL_ADMIN_NAME, 'Denish');
  const adminUsername = clean(process.env.LOCAL_ADMIN_USERNAME, 'Denish');
  const adminPassword = clean(process.env.LOCAL_ADMIN_PASSWORD, 'Denish@5555');

  await Settings.getOne();

  for (const departmentName of DEFAULT_DEPARTMENTS) {
    const existingDepartment = await Department.findByName(departmentName);
    if (!existingDepartment) {
      await Department.create({ name: departmentName });
    }
  }

  let existingAdmin = await User.findOne({ username: adminUsername }).select('+password');
  if (!existingAdmin) {
    existingAdmin = await User.findOne({ email: clean(process.env.LOCAL_ADMIN_EMAIL, 'denish@example.com') }).select('+password');
  }

  const adminEmail = clean(existingAdmin?.email || process.env.LOCAL_ADMIN_EMAIL, 'denish@example.com');

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const adminAccessSeed = existingAdmin?.adminAccessSeed || crypto.randomBytes(16).toString('hex');
  const adminAccessIssuedAt = existingAdmin?.adminAccessIssuedAt || new Date().toISOString();
  const accessArtifact = await writeAdminAccessFile({
    username: adminUsername,
    name: adminName,
    userId: 'pending',
    seed: adminAccessSeed,
    issuedAt: adminAccessIssuedAt,
  });

  if (existingAdmin) {
    await pool.query(
      `
        UPDATE users
        SET name = ?, username = ?, email = ?, password = ?, role = ?, department = ?, isActive = ?, createdBy = ?, managerId = ?, adminaccessseed = ?, adminaccessfilehash = ?, adminaccessfilename = ?, adminaccessissuedat = ?
        WHERE id = ?
      `,
      [
        adminName,
        adminUsername,
        adminEmail,
        hashedPassword,
        'admin',
        JSON.stringify([]),
        true,
        null,
        null,
        adminAccessSeed,
        accessArtifact.hash,
        accessArtifact.fileName,
        accessArtifact.issuedAt,
        existingAdmin._id,
      ]
    );
    console.log(`Local admin account refreshed: ${adminUsername}`);
    try {
      await ensureSupabaseAdminUser({
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        username: adminUsername,
        role: 'admin',
      });
    } catch (error) {
      console.warn(`Supabase Auth sync skipped for ${adminUsername}: ${error.message}`);
    }
    return;
  }

  const createdAdmin = await User.create({
    name: adminName,
    username: adminUsername,
    email: adminEmail,
    password: hashedPassword,
    role: 'admin',
    department: [],
    isActive: true,
    createdBy: null,
    managerId: null,
    adminAccessSeed: adminAccessSeed,
    adminAccessFileHash: accessArtifact.hash,
    adminAccessFileName: accessArtifact.fileName,
    adminAccessIssuedAt: accessArtifact.issuedAt,
  });

  try {
    await ensureSupabaseAdminUser({
      email: createdAdmin.email || adminEmail,
      password: adminPassword,
      name: adminName,
      username: adminUsername,
      role: 'admin',
    });
  } catch (error) {
    console.warn(`Supabase Auth sync skipped for ${adminUsername}: ${error.message}`);
  }

  console.log(`Local admin account created: ${adminUsername}`);
}

module.exports = { ensureLocalBootstrap };
