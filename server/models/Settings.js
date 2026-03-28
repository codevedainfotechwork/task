const { pool } = require('../config/db');

class Settings {
  static async ensureTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id BIGSERIAL PRIMARY KEY,
        companyName VARCHAR(255) NOT NULL DEFAULT 'TASKFLOW',
        logoDataUrl TEXT NULL
      )
    `);
  }

  static async getOne() {
    await this.ensureTable();
    const [rows] = await pool.query('SELECT * FROM settings LIMIT 1');
    if (rows.length === 0) {
      // Create default if missing
      const [result] = await pool.query("INSERT INTO settings (companyName, logoDataUrl) VALUES ('TASKFLOW', NULL)");
      return { id: result.insertId, companyName: 'TASKFLOW', logoDataUrl: null };
    }
    return rows[0];
  }

  static async update(updates) {
    await this.ensureTable();
    const fields = [];
    const values = [];
    const current = await this.getOne();

    if (typeof updates.companyName === 'string') {
      fields.push('companyName = ?');
      values.push(updates.companyName);
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'logoDataUrl')) {
      fields.push('logoDataUrl = ?');
      values.push(updates.logoDataUrl || null);
    }

    if (!fields.length) {
      return current;
    }

    const query = 'UPDATE settings SET ' + fields.join(', ') + ' WHERE id = ?';
    values.push(current.id);
    await pool.query(query, values);
    return await this.getOne();
  }
}

module.exports = Settings;
