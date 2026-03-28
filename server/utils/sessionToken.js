const crypto = require('crypto');
const User = require('../models/User');

const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function createSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function parseDurationToMs(value) {
  const input = String(value || '').trim().toLowerCase();
  if (!input) return DEFAULT_SESSION_TTL_MS;

  const match = input.match(/^(\d+)\s*(s|m|h|d|w)?$/);
  if (!match) return DEFAULT_SESSION_TTL_MS;

  const amount = Number(match[1]);
  const unit = match[2] || 'd';

  switch (unit) {
    case 's': return amount * 1000;
    case 'm': return amount * 60 * 1000;
    case 'h': return amount * 60 * 60 * 1000;
    case 'd': return amount * 24 * 60 * 60 * 1000;
    case 'w': return amount * 7 * 24 * 60 * 60 * 1000;
    default: return DEFAULT_SESSION_TTL_MS;
  }
}

function getSessionTtlMs() {
  return parseDurationToMs(process.env.SESSION_EXPIRES_IN || '7d');
}

async function persistSessionToken(userId, token) {
  const authTokenHash = hashSessionToken(token);
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + getSessionTtlMs());

  await User.updateSessionById(userId, {
    authTokenHash,
    authTokenIssuedAt: issuedAt,
    authTokenExpiresAt: expiresAt,
  });

  return {
    token,
    issuedAt,
    expiresAt,
    authTokenHash,
  };
}

async function issueSessionTokenForUser(userId) {
  const token = createSessionToken();
  return persistSessionToken(userId, token);
}

async function findUserBySessionToken(token) {
  const authTokenHash = hashSessionToken(token);
  const user = await User.findByAuthTokenHash(authTokenHash).select('+password');

  if (!user) {
    return null;
  }

  if (user.authTokenExpiresAt) {
    const expiresAt = new Date(user.authTokenExpiresAt);
    if (Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
      return null;
    }
  }

  return user;
}

async function revokeSessionTokenForUser(userId) {
  await User.updateSessionById(userId, {
    authTokenHash: null,
    authTokenIssuedAt: null,
    authTokenExpiresAt: null,
  });
}

module.exports = {
  hashSessionToken,
  issueSessionTokenForUser,
  findUserBySessionToken,
  revokeSessionTokenForUser,
};
