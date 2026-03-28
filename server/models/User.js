const { pool } = require('../config/db');

class User {
  static _mapRow(row) {
    if (!row) return null;
    const obj = { ...row };
    obj._id = obj.id;
    obj.isActive = obj.isActive ?? obj.isactive;
    obj.createdBy = obj.createdBy ?? obj.createdby;
    obj.managerId = obj.managerId ?? obj.managerid;
    obj.inviteToken = obj.inviteToken ?? obj.invitetoken;
    obj.inviteExpiry = obj.inviteExpiry ?? obj.inviteexpiry;
    obj.adminAccessSeed = obj.adminAccessSeed ?? obj.adminaccessseed;
    obj.adminAccessFileHash = obj.adminAccessFileHash ?? obj.adminaccessfilehash;
    obj.adminAccessFileName = obj.adminAccessFileName ?? obj.adminaccessfilename;
    obj.adminAccessIssuedAt = obj.adminAccessIssuedAt ?? obj.adminaccessissuedat;
    obj.authTokenHash = obj.authTokenHash ?? obj.authtokenhash;
    obj.authTokenIssuedAt = obj.authTokenIssuedAt ?? obj.authtokenissuedat;
    obj.authTokenExpiresAt = obj.authTokenExpiresAt ?? obj.authtokenexpiresat;
    obj.createdAt = obj.createdAt ?? obj.createdat;
    
    // Parse department (JSON array string)
    try {
      if (typeof obj.department === 'string') {
        obj.department = JSON.parse(obj.department);
      }
    } catch(e) {
      obj.department = [];
    }
    
    if (!Array.isArray(obj.department)) {
       obj.department = obj.department ? [obj.department] : [];
    }

    // Ensure boolean types
    obj.isActive = obj.isActive === true || obj.isActive === 't' || obj.isActive === 1 || obj.isActive === '1';

    obj.toObject = function() {
      const clone = { ...this };
      delete clone.toObject;
      delete clone.select;
      return clone;
    };
    
    return obj;
  }

  static _makeQueryPromise(sql, params, isArray = false) {
    const self = this;
    const promise = pool.query(sql, params).then(([rows]) => {
      if (!rows || rows.length === 0) return isArray ? [] : null;
      if (isArray) return rows.map(r => self._mapRow(r));
      return self._mapRow(rows[0]);
    });
    
    promise.select = function() { return this; }; 
    return promise;
  }

  static normalizeDepartments(val) {
    if (typeof val === 'string') return [val.trim()];
    if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
    return [];
  }

  static findById(id) {
    if (!id) return this._makeQueryPromise('SELECT * FROM users WHERE id = -1', []);
    return this._makeQueryPromise('SELECT * FROM users WHERE id = ?', [id]);
  }

  static findOne(query) {
    if (!query) return this._makeQueryPromise('SELECT * FROM users LIMIT 1', []);
    
    let sql = 'SELECT * FROM users WHERE 1=1';
    let params = [];
    
    if (query.email || query.username) {
      const identifier = query.username || query.email;
      sql += ' AND (LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?))';
      params.push(identifier, identifier);
    }
    sql += ' LIMIT 1';
    
    return this._makeQueryPromise(sql, params);
  }

  static find(query) {
    let sql = 'SELECT * FROM users WHERE 1=1';
    let params = [];
    
    if (query) {
      if (query.managerId) {
        sql += ' AND managerId = ?';
        params.push(query.managerId);
      }
      if (query.role) {
        sql += ' AND role = ?';
        params.push(query.role);
      }
      if (query.isActive !== undefined) {
          sql += ' AND isActive = ?';
          params.push(Boolean(query.isActive));
      }
    }
    
    return this._makeQueryPromise(sql, params, true);
  }

  static async create(data) {
    const deptString = JSON.stringify(data.department || []);
    const username = String(data.username || data.email || data.name || '').trim();
    const [result] = await pool.query(
      'INSERT INTO users (username, name, email, password, role, department, isActive, createdBy, managerId, adminaccessseed, adminaccessfilehash, adminaccessfilename, adminaccessissuedat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        username,
        data.name,
        data.email,
        data.password,
        data.role || 'employee',
        deptString,
        data.isActive !== false,
        data.createdBy || null,
        data.managerId || null,
        data.adminAccessSeed || null,
        data.adminAccessFileHash || null,
        data.adminAccessFileName || null,
        data.adminAccessIssuedAt || null,
      ]
    );
    return await this.findById(result.insertId);
  }

  static async updateById(id, updates) {
    let sql = 'UPDATE users SET ';
    const params = [];
    const sets = [];
    
    if (updates.password) { sets.push('password = ?'); params.push(updates.password); }
    if (updates.isActive !== undefined) { sets.push('isActive = ?'); params.push(Boolean(updates.isActive)); }
    
    if (sets.length === 0) return this.findById(id);
    
    sql += sets.join(', ') + ' WHERE id = ?';
    params.push(id);
    
    await pool.query(sql, params);
    return await this.findById(id);
  }

  static async updateSessionById(id, updates = {}) {
    const sets = [];
    const params = [];

    if (updates.authTokenHash !== undefined) {
      sets.push('authTokenHash = ?');
      params.push(updates.authTokenHash);
    }
    if (updates.authTokenIssuedAt !== undefined) {
      sets.push('authTokenIssuedAt = ?');
      params.push(updates.authTokenIssuedAt);
    }
    if (updates.authTokenExpiresAt !== undefined) {
      sets.push('authTokenExpiresAt = ?');
      params.push(updates.authTokenExpiresAt);
    }

    if (sets.length === 0) return this.findById(id);

    const sql = `UPDATE users SET ${sets.join(', ')} WHERE id = ?`;
    params.push(id);
    await pool.query(sql, params);
    return await this.findById(id);
  }

  static findByAuthTokenHash(authTokenHash) {
    if (!authTokenHash) return this._makeQueryPromise('SELECT * FROM users WHERE id = -1', []);
    return this._makeQueryPromise('SELECT * FROM users WHERE authTokenHash = ? LIMIT 1', [authTokenHash]);
  }

  static async findByIdAndUpdate(id, updates) {
     return this.updateById(id, updates);
  }

  static async deleteMany() {
    const conn = await pool.getConnection();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      await conn.query('TRUNCATE TABLE users');
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
      conn.release();
    }
  }

  static async findByIdAndDelete(id) {
    const user = await this.findById(id);
    if (user) {
      await pool.query('DELETE FROM users WHERE id = ?', [id]);
    }
    return user;
  }

  static normalizeDepartments(input) {
    if (!input) return [];
    if (Array.isArray(input)) return input.map(d => String(d).trim()).filter(Boolean);
    if (typeof input === 'string') return input.split(',').map(d => d.trim()).filter(Boolean);
    return [];
  }
}

module.exports = User;
