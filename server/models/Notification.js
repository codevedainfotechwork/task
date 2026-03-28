const { pool } = require('../config/db');
const { sendPushNotification } = require('../utils/pushNotifications');

class Notification {
  static async ensureTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGSERIAL PRIMARY KEY,
        userId BIGINT NOT NULL,
        taskId BIGINT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        isRead BOOLEAN DEFAULT FALSE,
        link VARCHAR(255),
        description TEXT,
        taskTitle VARCHAR(255),
        transferMeta TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  }

  static _mapRow(row) {
    if (!row) return null;
    const obj = { ...row };
    obj._id = obj.id;
    obj.userId = obj.userId ?? obj.userid;
    obj.taskId = obj.taskId ?? obj.taskid;
    obj.isRead = obj.isRead ?? obj.isread;
    obj.link = obj.link ?? obj.link;
    obj.description = obj.description ?? obj.description;
    obj.taskTitle = obj.taskTitle ?? obj.tasktitle;
    obj.transferMeta = obj.transferMeta ?? obj.transfermeta;
    obj.createdAt = obj.createdAt ?? obj.createdat;
    obj.isRead = obj.isRead === true || obj.isRead === 't' || obj.isRead === 1 || obj.isRead === '1';
    
    if (obj.transferMeta) {
      try {
        obj.transferMeta = typeof obj.transferMeta === 'string' ? JSON.parse(obj.transferMeta) : obj.transferMeta;
      } catch (e) {
        console.error('Failed to parse transferMeta:', e);
      }
    }

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
    return this._makeQueryPromise('SELECT * FROM notifications WHERE id = ?', [id]);
  }

  static find(query = {}) {
    let sql = 'SELECT * FROM notifications WHERE 1=1';
    let params = [];
    if (query.userId !== undefined) {
       sql += ' AND userId = ?';
       params.push(query.userId);
    }
    sql += ' ORDER BY createdAt DESC';
    return this._makeQueryPromise(sql, params, true);
  }

  static findOne(query = {}) {
    let sql = 'SELECT * FROM notifications WHERE 1=1';
    let params = [];
    
    if (query._id !== undefined || query.id !== undefined) {
      sql += ' AND id = ?';
      params.push(query._id || query.id);
    }
    if (query.userId !== undefined) {
      sql += ' AND userId = ?';
      params.push(query.userId);
    }
    
    return this._makeQueryPromise(sql, params, false);
  }

  static async create(data) {
    await this.ensureTable();
    const [result] = await pool.query(
      'INSERT INTO notifications (userId, taskId, title, message, type, link, description, taskTitle, transferMeta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        data.userId, 
        data.taskId ?? null, 
        data.title || 'Notification', 
        data.message, 
        data.type || 'info', 
        data.link || null,
        data.description || null,
        data.taskTitle || null,
        data.transferMeta || null
      ]
    );
    const notification = await this.findById(result.insertId);
    if (notification?.userId) {
      void sendPushNotification(notification.userId, {
        title: notification.title || 'New Notification',
        body: notification.message || notification.description || 'You have a new update.',
        data: {
          notificationId: notification._id,
          taskId: notification.taskId || null,
          type: notification.type || 'info',
          link: notification.link || null,
        },
      });
    }
    return notification;
  }

  static async updateById(id, updates) {
    if (updates.isRead !== undefined) {
      await pool.query('UPDATE notifications SET isRead = ? WHERE id = ?', [Boolean(updates.isRead), id]);
    }
    return await this.findById(id);
  }

  static async updateMany(query = {}, updates = {}) {
    let sql = 'UPDATE notifications SET ';
    let params = [];
    let updateParts = [];

    if (updates.isRead !== undefined) {
      updateParts.push('isRead = ?');
      params.push(Boolean(updates.isRead));
    }

    if (updateParts.length === 0) return { modifiedCount: 0 };

    sql += updateParts.join(', ') + ' WHERE 1=1';

    if (query.userId !== undefined) {
      sql += ' AND userId = ?';
      params.push(query.userId);
    }
    if (query.isRead !== undefined) {
      sql += ' AND isRead = ?';
      params.push(Boolean(query.isRead));
    }

    const [result] = await pool.query(sql, params);
    return { modifiedCount: result.affectedRows };
  }

  static async findByIdAndUpdate(id, updates) {
    return this.updateById(id, updates);
  }

  static async deleteMany(query = {}) {
    if (query.taskId !== undefined) {
       await pool.query('DELETE FROM notifications WHERE taskId = ?', [query.taskId]);
    } else {
       const conn = await pool.getConnection();
       try {
         await conn.query('SET FOREIGN_KEY_CHECKS = 0');
         await conn.query('TRUNCATE TABLE notifications');
         await conn.query('SET FOREIGN_KEY_CHECKS = 1');
       } finally {
         conn.release();
       }
    }
    return { deletedCount: 1 };
  }
}

module.exports = Notification;
