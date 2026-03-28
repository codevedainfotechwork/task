const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const GENERATED_DIR = path.join(__dirname, '..', 'generated', 'admin-access');

function sanitizeBaseName(value) {
  return String(value || 'admin')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'admin';
}

function toBinaryString(buffer) {
  return Buffer.from(buffer)
    .toString('hex')
    .split('')
    .map((hexChar) => parseInt(hexChar, 16).toString(2).padStart(4, '0'))
    .join('');
}

function buildAdminAccessContent({ username, name, userId, issuedAt, accessId, binarySeal }) {
  return [
    'TASKFLOW ADMIN ACCESS FILE',
    `USERNAME: ${username}`,
    `NAME: ${name}`,
    `USER_ID: ${userId || 'pending'}`,
    `ISSUED_AT: ${issuedAt}`,
    `ACCESS_ID: ${accessId}`,
    `BINARY_SEAL: ${binarySeal}`,
    'MARKER: 01010100010000010101001101001011',
  ].join('\n') + '\n';
}

async function ensureGeneratedDir() {
  await fs.mkdir(GENERATED_DIR, { recursive: true });
}

async function writeAdminAccessFile({ username, name, userId, seed, issuedAt }) {
  await ensureGeneratedDir();

  const artifact = createAdminAccessArtifact({ username, name, userId, seed, issuedAt });
  const filePath = path.join(GENERATED_DIR, artifact.fileName);

  await fs.writeFile(filePath, artifact.content, 'utf8');

  return {
    fileName: artifact.fileName,
    filePath,
    content: artifact.content,
    hash: artifact.hash,
    issuedAt: artifact.issuedAt,
  };
}

function createAdminAccessArtifact({ username, name, userId, seed, issuedAt }) {
  const issuedAtValue = issuedAt || new Date().toISOString();
  const deterministicSeed = String(seed || `${username}:${issuedAtValue}`);
  const digest = crypto.createHash('sha256').update(deterministicSeed).digest();
  const accessId = digest.subarray(0, 8).toString('hex');
  const binarySeal = toBinaryString(digest.subarray(8, 24));
  const content = buildAdminAccessContent({ username, name, userId, issuedAt: issuedAtValue, accessId, binarySeal });
  const hash = crypto.createHash('sha256').update(content).digest('hex');

  return {
    fileName: `${sanitizeBaseName(username)}.taskauth`,
    content,
    hash,
    issuedAt: issuedAtValue,
  };
}

function parseAdminAccessFile(buffer) {
  if (!buffer) {
    return null;
  }

  const content = Buffer.isBuffer(buffer) ? buffer.toString('utf8') : String(buffer);
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const entries = {};

  for (const line of lines) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim().toUpperCase();
    const value = line.slice(separatorIndex + 1).trim();
    entries[key] = value;
  }

  return {
    content,
    entries,
    hasMarker: content.includes('MARKER: 01010100010000010101001101001011'),
  };
}

async function verifyAdminAccessFile(buffer, expectedMeta = null, expectedArtifact = null) {
  if (!buffer) {
    return false;
  }

  const parsed = parseAdminAccessFile(buffer);
  if (!parsed?.hasMarker) {
    return false;
  }

  if (expectedMeta) {
    const expectedUsername = String(expectedMeta.username || '').trim().toLowerCase();
    const expectedName = String(expectedMeta.name || '').trim().toLowerCase();
    const expectedUserId = String(expectedMeta.userId || '').trim();

    const uploadedUsername = String(parsed.entries.USERNAME || '').trim().toLowerCase();
    const uploadedName = String(parsed.entries.NAME || '').trim().toLowerCase();
    const uploadedUserId = String(parsed.entries.USER_ID || '').trim();

    if (expectedUsername && uploadedUsername !== expectedUsername) {
      return false;
    }

    if (expectedName && uploadedName !== expectedName) {
      return false;
    }

    if (expectedUserId && expectedUserId !== 'pending' && uploadedUserId !== expectedUserId) {
      return false;
    }
  }

  const actualHash = crypto.createHash('sha256').update(buffer).digest('hex');
  const expectedHash = expectedMeta?.hash || expectedArtifact?.hash || null;
  if (expectedHash && actualHash === expectedHash) {
    return true;
  }

  return Boolean(parsed?.entries?.USERNAME && parsed?.entries?.NAME);
}

async function readAdminAccessFile(filePath) {
  if (!filePath) {
    return null;
  }

  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

module.exports = {
  writeAdminAccessFile,
  createAdminAccessArtifact,
  verifyAdminAccessFile,
  parseAdminAccessFile,
  readAdminAccessFile,
  sanitizeBaseName,
};
