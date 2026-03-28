const { pool } = require('../config/db');

class ActivityLog {
  static _mapRow(row) {
    if (!row) return null;
    const obj = { ...row };
    obj._id = obj.id;
    obj.userId = obj.userId ?? obj.userid;
    obj.ipAddress = obj.ipAddress ?? obj.ipaddress;
    obj.ip = obj.ipAddress;
    obj.createdAt = obj.createdAt ?? obj.createdat;
    obj.timestamp = obj.createdAt;
    obj.toObject = function() { return { ...this }; };
    return obj;
  }

  static _makeQueryPromise(sql, params, isArray = false) {
    const self = this;
    return pool.query(sql, params).then(([rows]) => {
      if (!rows || rows.length === 0) return isArray ? [] : null;
      if (isArray) return rows.map(r => self._mapRow(r));
      return self._mapRow(rows[0]);
    });
  }

  static find(query = {}) {
    return this._makeQueryPromise('SELECT * FROM activity_logs ORDER BY createdAt DESC LIMIT 100', [], true);
  }

  static async create(data) {
    const [result] = await pool.query(
      'INSERT INTO activity_logs (userId, action, details, ipAddress, userAgent) VALUES (?, ?, ?, ?, ?)',
      [data.userId || null, data.action, data.details || null, data.ip || null, data.userAgent || null]
    );
    return this._makeQueryPromise('SELECT * FROM activity_logs WHERE id = ?', [result.insertId]);
  }
  
  static async deleteMany() {
    const conn = await pool.getConnection();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      await conn.query('TRUNCATE TABLE activity_logs');
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
      conn.release();
    }
  }
}

module.exports = ActivityLog;
