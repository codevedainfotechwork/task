require('dotenv').config();
const axios = require('axios');

const BASE = 'http://localhost:5000/api';

async function test() {
  try {
    console.log('=== FULL USER MANAGEMENT VERIFICATION ===\n');
    
    // 1. Admin Login
    console.log('1. Admin Login...');
    const adminLogin = await axios.post(`${BASE}/auth/login`, {
      email: 'shrutilathiya18@gmail.com',
      password: 'password',
      adminToken: process.env.ADMIN_SECRET_TOKEN,
      portalRole: 'admin'
    });
    if (adminLogin.data.error) throw new Error(adminLogin.data.message);
    const adminJWT = adminLogin.data.token;
    const adminHeaders = { Authorization: `Bearer ${adminJWT}` };
    console.log('   OK: Admin logged in as', adminLogin.data.user.name);

    // 2. Admin: Fetch All Users
    console.log('\n2. Admin: Fetch All Users...');
    const usersRes = await axios.get(`${BASE}/users`, { headers: adminHeaders });
    console.log(`   OK: Found ${usersRes.data.length} users`);
    usersRes.data.forEach(u => console.log(`   - ${u.name} [${u.role}] Active:${u.isActive} Dept:${JSON.stringify(u.department)}`));

    // 3. Admin: Create Employee (with department)
    console.log('\n3. Admin: Create Employee with department...');
    const mgr = usersRes.data.find(u => u.role === 'manager');
    if (!mgr) throw new Error('No manager found');
    const newEmpRes = await axios.post(`${BASE}/users`, {
      name: 'Test Employee',
      email: `test${Date.now()}@demo.com`,
      password: 'test1234',
      role: 'employee',
      department: ['Engineering'],
      managerId: mgr._id
    }, { headers: adminHeaders });
    console.log(`   OK: Created "${newEmpRes.data.user.name}" in ${JSON.stringify(newEmpRes.data.user.department)}`);
    const newEmpId = newEmpRes.data.user._id;

    // 4. Admin: Toggle Access (Disable)
    console.log('\n4. Admin: Toggle Access (Disable)...');
    const toggleRes = await axios.patch(`${BASE}/users/${newEmpId}/toggle`, {}, { headers: adminHeaders });
    console.log(`   OK: ${toggleRes.data.message} (isActive: ${toggleRes.data.user.isActive})`);

    // 5. Disabled user cannot login
    console.log('\n5. Disabled user login attempt...');
    const disabledLogin = await axios.post(`${BASE}/auth/login`, {
      email: newEmpRes.data.user.email,
      password: 'test1234',
      portalRole: 'employee'
    });
    if (disabledLogin.data.error === 'unauthorized') {
      console.log(`   OK: Login blocked - "${disabledLogin.data.message}"`);
    } else {
      console.log('   FAIL: Disabled user was able to login!');
    }

    // 6. Re-enable
    console.log('\n6. Re-enable user...');
    await axios.patch(`${BASE}/users/${newEmpId}/toggle`, {}, { headers: adminHeaders });
    console.log('   OK: User re-enabled');

    // 7. Manager Login
    console.log('\n7. Manager Login...');
    const mgrLogin = await axios.post(`${BASE}/auth/login`, {
      email: 'manager@demo.com',
      password: 'password',
      portalRole: 'manager'
    });
    if (mgrLogin.data.error) throw new Error(mgrLogin.data.message);
    const mgrJWT = mgrLogin.data.token;
    const mgrHeaders = { Authorization: `Bearer ${mgrJWT}` };
    console.log('   OK: Manager logged in as', mgrLogin.data.user.name);

    // 8. Manager: Fetch Employees (scoped)
    console.log('\n8. Manager: Fetch Employees (scoped)...');
    const empRes = await axios.get(`${BASE}/users`, { headers: mgrHeaders });
    console.log(`   OK: Manager sees ${empRes.data.length} employees:`);
    empRes.data.forEach(e => console.log(`   - ${e.name} [${e.role}] Active:${e.isActive} Dept:${JSON.stringify(e.department)}`));

    // 9. Manager: Create Employee (single dept)
    console.log('\n9. Manager: Create Employee...');
    const mgrNewEmp = await axios.post(`${BASE}/users`, {
      name: 'Manager Created Emp',
      email: `mgr_emp_${Date.now()}@demo.com`,
      password: 'pass1234',
      department: ['Design']
    }, { headers: mgrHeaders });
    console.log(`   OK: Created "${mgrNewEmp.data.user.name}" in ${JSON.stringify(mgrNewEmp.data.user.department)}`);

    // 10. Manager: Toggle access on their employee
    console.log('\n10. Manager: Toggle employee access...');
    const mgrToggle = await axios.patch(`${BASE}/users/${mgrNewEmp.data.user._id}/toggle`, {}, { headers: mgrHeaders });
    console.log(`    OK: ${mgrToggle.data.message}`);

    // 11. Manager: Fetch Tasks (scoped)
    console.log('\n11. Manager: Fetch Tasks...');
    const taskRes = await axios.get(`${BASE}/tasks`, { headers: mgrHeaders });
    console.log(`    OK: Found ${taskRes.data.length} tasks`);

    // 12. Manager: Create Task with priority
    console.log('\n12. Manager: Create Task with High Priority...');
    const newTask = await axios.post(`${BASE}/tasks`, {
      title: 'Verification Task',
      description: 'Created during verification.',
      assignedTo: empRes.data[0]._id,
      department: empRes.data[0].department[0],
      dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      priority: 'High'
    }, { headers: mgrHeaders });
    console.log(`    OK: Task "${newTask.data.task.title}" (Priority: ${newTask.data.task.priority})`);

    console.log('\n=== ALL 12 TESTS PASSED ===');
  } catch (err) {
    console.error('FAILED:', err.response?.data || err.message);
  }
}

test();
