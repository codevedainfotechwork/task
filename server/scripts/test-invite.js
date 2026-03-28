require('dotenv').config();
const axios = require('axios');

const BASE = 'http://localhost:5000/api';

async function test() {
  try {
    // Step 1: Admin Login
    console.log('--- Step 1: Admin Login ---');
    const loginRes = await axios.post(`${BASE}/auth/login`, {
      email: 'shrutilathiya18@gmail.com',
      password: 'password',
      adminAuthFile: null,
      portalRole: 'admin'
    });
    const jwt = loginRes.data.token;
    console.log('OK: Admin logged in as', loginRes.data.user.name);

    const headers = { Authorization: `Bearer ${jwt}` };

    // Step 2: Test auth middleware
    console.log('\n--- Step 2: Auth Middleware Test ---');
    const meRes = await axios.get(`${BASE}/auth/me`, { headers });
    console.log('OK: /auth/me returned:', meRes.data.name, meRes.data.role);

    // Step 3: Create Manager (direct credentials)
    console.log('\n--- Step 3: Create Manager ---');
    const mgrRes = await axios.post(`${BASE}/users`, {
      name: 'Test Manager Direct',
      email: `mgr${Date.now()}@test.com`,
      password: 'manager123',
      role: 'manager',
      department: ['Engineering', 'Design']
    }, { headers });
    console.log('OK:', mgrRes.data.message);
    const mgrEmail = mgrRes.data.user.email;

    // Step 4: Login as new manager
    console.log('\n--- Step 4: Manager Login ---');
    const mgrLogin = await axios.post(`${BASE}/auth/login`, {
      email: mgrEmail,
      password: 'manager123',
      portalRole: 'manager'
    });
    console.log('OK: Manager logged in as', mgrLogin.data.user.name);
    const mgrToken = mgrLogin.data.token;
    const mgrHeaders = { Authorization: `Bearer ${mgrToken}` };

    // Step 5: Manager creates Employee (direct credentials)
    console.log('\n--- Step 5: Manager Creates Employee ---');
    const empRes = await axios.post(`${BASE}/users`, {
      name: 'Test Employee Direct',
      email: `emp${Date.now()}@test.com`,
      password: 'employee123',
      role: 'employee',
      department: ['Engineering']
    }, { headers: mgrHeaders });
    console.log('OK:', empRes.data.message);
    const empEmail = empRes.data.user.email;

    // Step 6: Login as new employee
    console.log('\n--- Step 6: Employee Login ---');
    const empLogin = await axios.post(`${BASE}/auth/login`, {
      email: empEmail,
      password: 'employee123',
      portalRole: 'employee'
    });
    console.log('OK: Employee logged in as', empLogin.data.user.name);

    // Step 7: Admin creates Employee with managerId
    console.log('\n--- Step 7: Admin Creates Employee with Manager ---');
    const empRes2 = await axios.post(`${BASE}/users`, {
      name: 'Admin-Created Employee',
      email: `admemp${Date.now()}@test.com`,
      password: 'emp12345',
      role: 'employee',
      department: ['Design'],
      managerId: mgrRes.data.user._id
    }, { headers });
    console.log('OK:', empRes2.data.message);

    // Step 8: Toggle user access
    console.log('\n--- Step 8: Toggle User Access ---');
    const toggleRes = await axios.patch(`${BASE}/users/${empRes2.data.user._id}/toggle`, {}, { headers });
    console.log('OK:', toggleRes.data.message, '(isActive:', toggleRes.data.user.isActive + ')');

    // Step 9: Disabled user cannot login
    console.log('\n--- Step 9: Disabled User Login Test ---');
    try {
      await axios.post(`${BASE}/auth/login`, {
        email: empRes2.data.user.email,
        password: 'emp12345',
        portalRole: 'employee'
      });
      console.log('FAIL: Should have been rejected');
    } catch (e) {
      console.log('OK: Disabled user blocked -', e.response?.data?.message || 'rejected');
    }

    console.log('\n=== ALL 9 TESTS PASSED! ===');
  } catch (err) {
    console.error('FAILED:', err.response?.data || err.message);
  }
}

test();
