const { pool } = require('../config/db');

class HelpRequest {
  static async ensureTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS help_requests (
        id BIGSERIAL PRIMARY KEY,
        requesterId BIGINT NOT NULL,
        requesterName VARCHAR(255) NOT NULL,
        requesterRole VARCHAR(50) NOT NULL DEFAULT 'employee',
        managerId BIGINT NOT NULL,
        managerName VARCHAR(255) DEFAULT NULL,
        department VARCHAR(255) DEFAULT NULL,
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        reply TEXT DEFAULT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Open',
        repliedBy BIGINT DEFAULT NULL,
        repliedByName VARCHAR(255) DEFAULT NULL,
        repliedAt TIMESTAMP DEFAULT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  static _mapRow(row) {
    if (!row) return null;
    const obj = { ...row };
    obj._id = obj.id;
    obj.requesterId = obj.requesterId ?? obj.requesterid;
    obj.managerId = obj.managerId ?? obj.managerid;
    obj.repliedBy = obj.repliedBy ?? obj.repliedby;
    obj.repliedAt = obj.repliedAt ?? obj.repliedat;
    obj.createdAt = obj.createdAt ?? obj.createdat;
    obj.toObject = function toObject() {
      const clone = { ...this };
      delete clone.toObject;
      return clone;
    };
    return obj;
  }

  static async _query(sql, params = [], isArray = false) {
    await this.ensureTable();
    const [rows] = await pool.query(sql, params);
    if (!rows || rows.length === 0) return isArray ? [] : null;
    if (isArray) return rows.map((row) => this._mapRow(row));
    return this._mapRow(rows[0]);
  }

  static async findById(id) {
    if (!id) return null;
    return this._query('SELECT * FROM help_requests WHERE id = ?', [id], false);
  }

  static async find(query = {}) {
    let sql = 'SELECT * FROM help_requests WHERE 1=1';
    const params = [];

    if (query.requesterId !== undefined) {
      sql += ' AND requesterId = ?';
      params.push(query.requesterId);
    }

    if (query.managerId !== undefined) {
      sql += ' AND managerId = ?';
      params.push(query.managerId);
    }

    if (query.department !== undefined) {
      sql += ' AND department = ?';
      params.push(query.department);
    }

    if (query.status !== undefined) {
      sql += ' AND status = ?';
      params.push(query.status);
    }

    sql += ' ORDER BY createdAt DESC, id DESC';
    return this._query(sql, params, true);
  }

  static async create(data) {
    await this.ensureTable();
    const [result] = await pool.query(
      `INSERT INTO help_requests (
        requesterId, requesterName, requesterRole, managerId, managerName,
        department, subject, description, reply, status, repliedBy, repliedByName, repliedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.requesterId,
        data.requesterName || 'Unknown',
        data.requesterRole || 'employee',
        data.managerId,
        data.managerName || null,
        data.department || null,
        data.subject,
        data.description,
        data.reply || null,
        data.status || 'Open',
        data.repliedBy || null,
        data.repliedByName || null,
        data.repliedAt || null,
      ]
    );

    return this.findById(result.insertId);
  }

  static async updateById(id, updates = {}) {
    await this.ensureTable();
    const fields = [];
    const params = [];

    const mapping = [
      'subject',
      'description',
      'reply',
      'status',
      'repliedBy',
      'repliedByName',
      'repliedAt',
      'managerName',
      'requesterName',
      'department',
    ];

    mapping.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(updates, field)) {
        fields.push(`${field} = ?`);
        params.push(updates[field]);
      }
    });

    if (!fields.length) {
      return this.findById(id);
    }

    params.push(id);
    await pool.query(`UPDATE help_requests SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  static async deleteMany() {
    await this.ensureTable();
    const conn = await pool.getConnection();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      await conn.query('TRUNCATE TABLE help_requests');
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
      conn.release();
    }
  }
}

module.exports = HelpRequest;
