const { pool } = require('../config/db');

class TaskAttachment {
  static async ensureTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_attachments (
        id BIGSERIAL PRIMARY KEY,
        taskId BIGINT NOT NULL,
        originalName VARCHAR(255) NOT NULL,
        storedName VARCHAR(255) NOT NULL,
        mimeType VARCHAR(120) NOT NULL,
        size INT NOT NULL,
        uploadedBy BIGINT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  static async createMany(taskId, files = [], uploadedBy = null) {
    if (!files.length) return [];
    await this.ensureTable();

    const values = files.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
    const params = [];
    files.forEach((file) => {
      params.push(
        taskId,
        file.originalname,
        file.filename,
        file.mimetype,
        file.size,
        uploadedBy
      );
    });

    await pool.query(
      `INSERT INTO task_attachments (taskId, originalName, storedName, mimeType, size, uploadedBy) VALUES ${values}`,
      params
    );

    return this.findByTaskId(taskId);
  }

  static async findByTaskId(taskId) {
    await this.ensureTable();
    const [rows] = await pool.query(
      'SELECT * FROM task_attachments WHERE taskId = ? ORDER BY createdAt DESC',
      [taskId]
    );
    return rows || [];
  }

  static async findByTaskIds(taskIds = []) {
    if (!taskIds.length) return [];
    await this.ensureTable();
    const placeholders = taskIds.map(() => '?').join(', ');
    const [rows] = await pool.query(
      `SELECT * FROM task_attachments WHERE taskId IN (${placeholders}) ORDER BY createdAt DESC`,
      taskIds
    );
    return rows || [];
  }
}

module.exports = TaskAttachment;
