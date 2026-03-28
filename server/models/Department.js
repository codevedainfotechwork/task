const { pool } = require('../config/db');

class Department {
  static _mapRow(row) {
    if (!row) return null;
    const obj = { ...row };
    obj._id = obj.id;
    obj.isDeleted = obj.isDeleted ?? obj.isdeleted;
    obj.createdAt = obj.createdAt ?? obj.createdat;
    obj.isDeleted = obj.isDeleted === true || obj.isDeleted === 't' || obj.isDeleted === 1 || obj.isDeleted === '1';
    obj.toObject = function() {
      const clone = { ...this };
      delete clone.toObject;
      return clone;
    };
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

  static findById(id) {
    return this._makeQueryPromise('SELECT * FROM departments WHERE id = ?', [id]);
  }

  static findActive() {
    return this._makeQueryPromise('SELECT * FROM departments WHERE isDeleted = FALSE ORDER BY name ASC', [], true);
  }

  static async findByName(name) {
    return await this._makeQueryPromise('SELECT * FROM departments WHERE LOWER(name) = LOWER(?) AND isDeleted = FALSE LIMIT 1', [name]);
  }

  static normalizeName(name) {
    return name ? String(name).trim() : null;
  }

  static async create(data) {
    try {
      const [result] = await pool.query('INSERT INTO departments (name) VALUES (?)', [data.name]);
      return await this.findById(result.insertId);
    } catch (error) {
      if (error && error.code === '23505') {
        throw new Error('Department name already exists');
      }
      throw error;
    }
  }

  static async deleteSafe(id) {
    await pool.query('UPDATE departments SET isDeleted = TRUE WHERE id = ?', [id]);
    return await this.findById(id);
  }

  static async findByIdAndUpdate(id, updates) {
     if (updates.isDeleted !== undefined) {
        await pool.query('UPDATE departments SET isDeleted = ? WHERE id = ?', [Boolean(updates.isDeleted), id]);
     }
     return await this.findById(id);
  }

  static async deleteMany() {
    const conn = await pool.getConnection();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      await conn.query('TRUNCATE TABLE departments');
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
      conn.release();
    }
  }
}

module.exports = Department;
