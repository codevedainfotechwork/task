require('dotenv').config();
const axios = require('axios');

const BASE = 'http://localhost:5000/api';

async function testManager() {
  try {
    console.log('--- Manager Dashboard Functionality Test ---');
    
    // 1. Manager Login
    console.log('1. Manager Login...');
    const loginRes = await axios.post(`${BASE}/auth/login`, {
      email: 'manager@demo.com',
      password: 'password',
      portalRole: 'manager'
    });
    const jwt = loginRes.data.token;
    const headers = { Authorization: `Bearer ${jwt}` };
    console.log('OK: Manager logged in.');

    // 2. Fetch Employees (Team Tab)
    console.log('\n2. Fetching Operators (Team Tab)...');
    const usersRes = await axios.get(`${BASE}/users`, { headers });
    console.log(`OK: Found ${usersRes.data.length} operators.`);
    const emp = usersRes.data[0];
    if (!emp) throw new Error('No employees found for this manager.');
    console.log(`Target Operator: ${emp.name} (Active: ${emp.isActive})`);

    // 3. Toggle Access
    console.log('\n3. Testing Toggle Access...');
    const toggleRes = await axios.patch(`${BASE}/users/${emp._id}/toggle`, {}, { headers });
    console.log(`OK: ${toggleRes.data.message} (New Status: ${toggleRes.data.user.isActive})`);
    
    // Toggle back
    await axios.patch(`${BASE}/users/${emp._id}/toggle`, {}, { headers });
    console.log('OK: Access restored.');

    // 4. Fetch Tasks (Directives Tab)
    console.log('\n4. Fetching Directives (Tasks Tab)...');
    const tasksRes = await axios.get(`${BASE}/tasks`, { headers });
    console.log(`OK: Found ${tasksRes.data.length} directives.`);

    // 5. Create Task with Priority
    console.log('\n5. Creating new Directive with High Priority...');
    const newTask = await axios.post(`${BASE}/tasks`, {
      title: 'Priority Verification Task',
      description: 'Testing if priority works.',
      assignedTo: emp._id,
      department: emp.department[0],
      priority: 'High',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
    }, { headers });
    console.log(`OK: Task "${newTask.data.task.title}" created with Priority: ${newTask.data.task.priority}`);

    console.log('\n=== MANAGER FUNCTIONALITY VERIFIED ===');
  } catch (err) {
    console.error('FAILED:', err.response?.data || err.message);
  }
}

testManager();
