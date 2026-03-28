const { pool } = require('../config/db');

class Task {
  static _mapRow(row) {
    if (!row) return null;
    const obj = { ...row };
    obj._id = obj.id;
    obj.assignedTo = obj.assignedTo ?? obj.assignedto;
    obj.assignedBy = obj.assignedBy ?? obj.assignedby;
    obj.dueDate = obj.dueDate ?? obj.duedate;
    obj.startDate = obj.startDate ?? obj.startdate;
    obj.reminderTime = obj.reminderTime ?? obj.remindertime;
    obj.employeeComment = obj.employeeComment ?? obj.employeecomment;
    obj.employeeCommentAt = obj.employeeCommentAt ?? obj.employeecommentat;
    obj.isTransferred = obj.isTransferred ?? obj.istransferred;
    obj.isArchived = obj.isArchived ?? obj.isarchived;
    obj.transferredAt = obj.transferredAt ?? obj.transferredat;
    obj.transferredFromManagerId = obj.transferredFromManagerId ?? obj.transferredfrommanagerid;
    obj.transferredFromManagerName = obj.transferredFromManagerName ?? obj.transferredfrommanagername;
    obj.transferredToManagerId = obj.transferredToManagerId ?? obj.transferredtomanagerid;
    obj.transferredToManagerName = obj.transferredToManagerName ?? obj.transferredtomanagername;
    obj.transferStatus = obj.transferStatus ?? obj.transferstatus;
    obj.transferReason = obj.transferReason ?? obj.transferreason;
    obj.completedAt = obj.completedAt ?? obj.completedat;
    obj.createdAt = obj.createdAt ?? obj.createdat;
    obj.isTransferred = obj.isTransferred === true || obj.isTransferred === 't' || obj.isTransferred === 1 || obj.isTransferred === '1';
    obj.isArchived = obj.isArchived === true || obj.isArchived === 't' || obj.isArchived === 1 || obj.isArchived === '1';

    obj.toObject = function() {
      const clone = { ...this };
      delete clone.toObject;
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
    return promise;
  }

  static findById(id) {
    if (!id) return this._makeQueryPromise('SELECT * FROM tasks WHERE id = -1', []);
    return this._makeQueryPromise('SELECT * FROM tasks WHERE id = ?', [id]);
  }

  static find(query = {}) {
    let sql = 'SELECT * FROM tasks WHERE 1=1';
    let params = [];
    
    if (query.department) {
      if (typeof query.department === 'object' && query.department.$in) {
        if (query.department.$in.length > 0) {
          sql += ` AND department IN (${query.department.$in.map(()=>'?').join(',')})`;
          params.push(...query.department.$in);
        } else {
          return Promise.resolve([]);
        }
      } else {
         sql += ' AND department = ?';
         params.push(query.department);
      }
    }
    
    if (query.assignedTo !== undefined) {
      sql += ' AND assignedTo = ?';
      params.push(query.assignedTo);
    }
    if (query.assignedBy !== undefined) {
      sql += ' AND assignedBy = ?';
      params.push(query.assignedBy);
    }
    if (query.status !== undefined) {
      sql += ' AND status = ?';
      params.push(query.status);
    }
    if (query.isArchived !== undefined) {
      sql += ' AND isArchived = ?';
      params.push(Boolean(query.isArchived));
    }
    if (query.isTransferred !== undefined) {
      sql += ' AND isTransferred = ?';
      params.push(Boolean(query.isTransferred));
    }
    if (query.transferredFromManagerId !== undefined) {
      sql += ' AND transferredFromManagerId = ?';
      params.push(query.transferredFromManagerId);
    }
    if (query.transferredToManagerId !== undefined) {
      sql += ' AND transferredToManagerId = ?';
      params.push(query.transferredToManagerId);
    }
    if (query.transferStatus !== undefined) {
      sql += ' AND transferStatus = ?';
      params.push(query.transferStatus);
    }

    return this._makeQueryPromise(sql, params, true);
  }

  static async create(data) {
    let cols = 'title, description, assignedTo, assignedBy, department, status, dueDate, startDate, priority, reminderTime, employeeComment, employeeCommentAt, transferStatus, transferredToManagerId, transferredToManagerName, transferredFromManagerId, transferredFromManagerName, transferredAt';
    let vals = '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
    let params = [
      data.title, 
      data.description || '', 
      data.assignedTo || null, 
      data.assignedBy || null, 
      data.department || null,
      data.status || 'Pending', 
      data.dueDate, 
      data.startDate || new Date().toISOString().split('T')[0], 
      data.priority || 'Medium', 
      data.reminderTime || null,
      data.employeeComment || null,
      data.employeeCommentAt || null,
      data.transferStatus || 'none',
      data.transferredToManagerId || null,
      data.transferredToManagerName || null,
      data.transferredFromManagerId || null,
      data.transferredFromManagerName || null,
      data.transferredAt || null
    ];

    const [result] = await pool.query(`INSERT INTO tasks (${cols}) VALUES (${vals})`, params);
    return await this.findById(result.insertId);
  }

  static async updateById(id, updates) {
    let sql = 'UPDATE tasks SET ';
    const params = [];
    const sets = [];
    
    const fields = [
      'title', 'description', 'assignedTo', 'assignedBy', 'department', 'status', 
      'dueDate', 'priority', 'reminderTime', 'completedAt', 'employeeComment', 'employeeCommentAt', 'isTransferred', 
      'transferredAt', 'transferredFromManagerId', 'transferredFromManagerName', 
      'transferredToManagerId', 'transferredToManagerName', 'transferStatus', 'isArchived'
    ];

    fields.forEach(f => {
      if (updates[f] !== undefined) {
        sets.push(`${f} = ?`);
        if (f === 'isTransferred' || f === 'isArchived') {
          params.push(Boolean(updates[f]));
        } else {
           params.push(updates[f]);
        }
      }
    });
    
    if (sets.length === 0) return this.findById(id);
    
    sql += sets.join(', ') + ' WHERE id = ?';
    params.push(id);
    console.log('[Task.updateById] SQL:', sql);
    console.log('[Task.updateById] Params:', JSON.stringify(params));
    
    await pool.query(sql, params);
    return await this.findById(id);
  }

  static async findByIdAndUpdate(id, updates) {
     return this.updateById(id, updates);
  }

  static async deleteMany() {
    const conn = await pool.getConnection();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      await conn.query('TRUNCATE TABLE tasks');
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
      conn.release();
    }
  }

  static async findByIdAndDelete(id) {
    const task = await this.findById(id);
    if (task) {
      await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
    }
    return task;
  }

  static normalizeStatus(status) {
    if (!status) return 'Pending';
    const s = String(status).toLowerCase();
    if (s.includes('progress')) return 'In Progress';
    if (s.includes('pend')) return 'Pending';
    if (s.includes('comp') || s.includes('done')) return 'Completed';
    return 'Pending';
  }

  static formatDateTime(date) {
    return new Date(date).toISOString().slice(0, 19).replace('T', ' ');
  }

  static formatDateOnly(date) {
    return new Date(date).toISOString().split('T')[0];
  }

  static normalizePriority(priority) {
    if (!priority) return 'Medium';
    const p = String(priority).toLowerCase();
    if (p === 'low') return 'Low';
    if (p === 'high') return 'High';
    return 'Medium';
  }
}

module.exports = Task;
