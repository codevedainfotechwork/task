const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function ensureSupabaseAuthConfig() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase Auth is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
}

function buildHeaders(extraHeaders = {}) {
  ensureSupabaseAuthConfig();
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
}

async function parseJson(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function supabaseAuthRequest(path, options = {}) {
  ensureSupabaseAuthConfig();

  const response = await fetch(`${supabaseUrl}${path}`, {
    method: options.method || 'GET',
    headers: buildHeaders(options.headers || {}),
    body: options.body || undefined,
  });

  const data = await parseJson(response);

  if (!response.ok) {
    const error = new Error(
      data.error_description ||
      data.msg ||
      data.message ||
      data.raw ||
      `Supabase Auth request failed (${response.status})`
    );
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

async function listSupabaseAuthUsers() {
  const data = await supabaseAuthRequest('/auth/v1/admin/users?per_page=1000&page=1');
  return Array.isArray(data.users) ? data.users : [];
}

async function findSupabaseAuthUserByEmail(email) {
  const target = String(email || '').trim().toLowerCase();
  if (!target) return null;

  const users = await listSupabaseAuthUsers();
  return users.find((user) => String(user.email || '').trim().toLowerCase() === target) || null;
}

async function ensureSupabaseAdminUser({ email, password, name, username, role = 'admin' }) {
  const cleanEmail = String(email || '').trim();
  const cleanPassword = String(password || '');

  if (!cleanEmail || !cleanPassword) {
    throw new Error('Admin email and password are required for Supabase Auth sync.');
  }

  const userMetadata = {
    name: String(name || '').trim() || cleanEmail,
    username: String(username || cleanEmail).trim() || cleanEmail,
    role,
  };

  const existing = await findSupabaseAuthUserByEmail(cleanEmail);
  const payload = {
    email: cleanEmail,
    password: cleanPassword,
    email_confirm: true,
    user_metadata: userMetadata,
  };

  if (existing) {
    await supabaseAuthRequest(`/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return { id: existing.id, email: cleanEmail, updated: true };
  }

  const created = await supabaseAuthRequest('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return created;
}

async function signInSupabaseAdmin({ email, password }) {
  const cleanEmail = String(email || '').trim();
  const cleanPassword = String(password || '');

  if (!cleanEmail || !cleanPassword) {
    throw new Error('Admin email and password are required for Supabase Auth login.');
  }

  ensureSupabaseAuthConfig();

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
  });

  const data = await parseJson(response);

  if (!response.ok) {
    const error = new Error(
      data.error_description ||
      data.msg ||
      data.message ||
      data.raw ||
      'Invalid credentials'
    );
    error.status = response.status;
    error.code = data.error || data.error_code || 'invalid_credentials';
    error.payload = data;
    throw error;
  }

  return data;
}

module.exports = {
  ensureSupabaseAuthConfig,
  ensureSupabaseAdminUser,
  signInSupabaseAdmin,
};
