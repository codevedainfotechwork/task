const { pool } = require('../config/db');

class PushSubscription {
  static _mapRow(row) {
    if (!row) return null;
    const obj = { ...row };
    obj._id = obj.id;
    obj.userId = obj.userId ?? obj.userid;
    obj.p256dh = obj.p256dh ?? obj.p256dh;
    obj.auth = obj.auth ?? obj.auth;
    obj.expirationTime = obj.expirationTime ?? obj.expirationtime;
    obj.createdAt = obj.createdAt ?? obj.createdat;
    obj.updatedAt = obj.updatedAt ?? obj.updatedat;
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
      if (isArray) return rows.map((r) => self._mapRow(r));
      return self._mapRow(rows[0]);
    });
  }

  static async findByUserId(userId) {
    return this._makeQueryPromise('SELECT * FROM push_subscriptions WHERE userId = ?', [userId], true);
  }

  static async findByEndpoint(endpoint) {
    return this._makeQueryPromise('SELECT * FROM push_subscriptions WHERE endpoint = ? LIMIT 1', [endpoint]);
  }

  static async upsert(data) {
    const existing = await this.findByEndpoint(data.endpoint);
    if (existing) {
      await pool.query(
        'UPDATE push_subscriptions SET userId = ?, p256dh = ?, auth = ?, expirationTime = ?, userAgent = ?, updatedAt = CURRENT_TIMESTAMP WHERE endpoint = ?',
        [data.userId, data.p256dh, data.auth, data.expirationTime || null, data.userAgent || null, data.endpoint]
      );
      return this.findByEndpoint(data.endpoint);
    }

    const [result] = await pool.query(
      'INSERT INTO push_subscriptions (userId, endpoint, p256dh, auth, expirationTime, userAgent) VALUES (?, ?, ?, ?, ?, ?)',
      [data.userId, data.endpoint, data.p256dh, data.auth, data.expirationTime || null, data.userAgent || null]
    );
    return this._makeQueryPromise('SELECT * FROM push_subscriptions WHERE id = ?', [result.insertId]);
  }

  static async deleteByEndpoint(endpoint) {
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
  }

  static async deleteManyByUserId(userId) {
    await pool.query('DELETE FROM push_subscriptions WHERE userId = ?', [userId]);
  }
}

module.exports = PushSubscription;
