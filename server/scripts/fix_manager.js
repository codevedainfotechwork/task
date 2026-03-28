const {pool} = require('../config/db');
pool.query('UPDATE users SET department = ? WHERE role = ?', [JSON.stringify(['Engineering']), 'manager'])
  .then(()=> { console.log('Fixed manager departments'); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });
