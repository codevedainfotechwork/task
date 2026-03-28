async function ensureCoreSchema(pool) {
  const statements = [
    `
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        username VARCHAR(100),
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255),
        role VARCHAR(20) DEFAULT 'employee',
        department TEXT,
        isActive BOOLEAN DEFAULT TRUE,
        createdBy BIGINT REFERENCES users(id) ON DELETE SET NULL,
        managerId BIGINT REFERENCES users(id) ON DELETE SET NULL,
        inviteToken VARCHAR(255),
        inviteExpiry TIMESTAMP,
        adminAccessSeed TEXT,
        adminAccessFileHash TEXT,
        adminAccessFileName VARCHAR(255),
        adminAccessIssuedAt TIMESTAMP,
        authTokenHash TEXT,
        authTokenIssuedAt TIMESTAMP,
        authTokenExpiresAt TIMESTAMP,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS departments (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        isDeleted BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS tasks (
        id BIGSERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        dueDate DATE,
        startDate DATE,
        priority VARCHAR(50) DEFAULT 'Medium',
        reminderTime VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Pending',
        employeeComment TEXT,
        employeeCommentAt TIMESTAMP,
        isArchived BOOLEAN DEFAULT FALSE,
        isTransferred BOOLEAN DEFAULT FALSE,
        transferredAt VARCHAR(255),
        transferredFromManagerId BIGINT,
        transferredFromManagerName VARCHAR(255),
        transferredToManagerId BIGINT,
        transferredToManagerName VARCHAR(255),
        transferStatus VARCHAR(50) DEFAULT 'none',
        transferReason TEXT,
        assignedTo BIGINT REFERENCES users(id) ON DELETE CASCADE,
        assignedBy BIGINT REFERENCES users(id) ON DELETE CASCADE,
        department VARCHAR(100),
        completedAt TIMESTAMP,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGSERIAL PRIMARY KEY,
        userId BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        taskId BIGINT REFERENCES tasks(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        isRead BOOLEAN DEFAULT FALSE,
        link VARCHAR(255),
        description TEXT,
        taskTitle VARCHAR(255),
        transferMeta TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS activity_logs (
        id BIGSERIAL PRIMARY KEY,
        userId BIGINT REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(255) NOT NULL,
        details TEXT,
        ipAddress VARCHAR(45),
        userAgent TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS help_requests (
        id BIGSERIAL PRIMARY KEY,
        requesterId BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        requesterName VARCHAR(255) NOT NULL,
        requesterRole VARCHAR(50) NOT NULL DEFAULT 'employee',
        managerId BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        managerName VARCHAR(255),
        department VARCHAR(255),
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        reply TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'Open',
        repliedBy BIGINT REFERENCES users(id) ON DELETE SET NULL,
        repliedByName VARCHAR(255),
        repliedAt TIMESTAMP,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS settings (
        id BIGSERIAL PRIMARY KEY,
        companyName VARCHAR(255) NOT NULL DEFAULT 'TASKFLOW',
        logoDataUrl TEXT
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS task_attachments (
        id BIGSERIAL PRIMARY KEY,
        taskId BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        originalName VARCHAR(255) NOT NULL,
        storedName VARCHAR(255) NOT NULL,
        mimeType VARCHAR(120) NOT NULL,
        size INTEGER NOT NULL,
        uploadedBy BIGINT REFERENCES users(id) ON DELETE SET NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id BIGSERIAL PRIMARY KEY,
        userId BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT UNIQUE NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        expirationTime BIGINT NULL,
        userAgent TEXT,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `,
  ];

  for (const statement of statements) {
    await pool.query(statement);
  }

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS adminaccessseed TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS adminaccessfilehash TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS adminaccessfilename VARCHAR(255)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS adminaccessissuedat TIMESTAMP`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS authTokenHash TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS authTokenIssuedAt TIMESTAMP`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS authTokenExpiresAt TIMESTAMP`);
  await pool.query(`
    UPDATE users
    SET username = COALESCE(NULLIF(username, ''), split_part(email, '@', 1), email)
    WHERE username IS NULL OR username = ''
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_auth_token_hash ON users (authTokenHash)`);

  // Normalize legacy integer flags to booleans for Postgres compatibility.
  await pool.query(`ALTER TABLE users ALTER COLUMN isActive DROP DEFAULT`);
  await pool.query(`ALTER TABLE users ALTER COLUMN isActive TYPE BOOLEAN USING CASE WHEN LOWER(COALESCE(isActive::text, '')) IN ('1', 't', 'true', 'yes') THEN TRUE ELSE FALSE END`);
  await pool.query(`ALTER TABLE users ALTER COLUMN isActive SET DEFAULT TRUE`);
  await pool.query(`ALTER TABLE departments ALTER COLUMN isDeleted DROP DEFAULT`);
  await pool.query(`ALTER TABLE departments ALTER COLUMN isDeleted TYPE BOOLEAN USING CASE WHEN LOWER(COALESCE(isDeleted::text, '')) IN ('1', 't', 'true', 'yes') THEN TRUE ELSE FALSE END`);
  await pool.query(`ALTER TABLE departments ALTER COLUMN isDeleted SET DEFAULT FALSE`);
  await pool.query(`ALTER TABLE tasks ALTER COLUMN isArchived DROP DEFAULT`);
  await pool.query(`ALTER TABLE tasks ALTER COLUMN isArchived TYPE BOOLEAN USING CASE WHEN LOWER(COALESCE(isArchived::text, '')) IN ('1', 't', 'true', 'yes') THEN TRUE ELSE FALSE END`);
  await pool.query(`ALTER TABLE tasks ALTER COLUMN isArchived SET DEFAULT FALSE`);
  await pool.query(`ALTER TABLE tasks ALTER COLUMN isTransferred DROP DEFAULT`);
  await pool.query(`ALTER TABLE tasks ALTER COLUMN isTransferred TYPE BOOLEAN USING CASE WHEN LOWER(COALESCE(isTransferred::text, '')) IN ('1', 't', 'true', 'yes') THEN TRUE ELSE FALSE END`);
  await pool.query(`ALTER TABLE tasks ALTER COLUMN isTransferred SET DEFAULT FALSE`);
  await pool.query(`ALTER TABLE notifications ALTER COLUMN isRead DROP DEFAULT`);
  await pool.query(`ALTER TABLE notifications ALTER COLUMN isRead TYPE BOOLEAN USING CASE WHEN LOWER(COALESCE(isRead::text, '')) IN ('1', 't', 'true', 'yes') THEN TRUE ELSE FALSE END`);
  await pool.query(`ALTER TABLE notifications ALTER COLUMN isRead SET DEFAULT FALSE`);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_department ON tasks (department)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks (assignedTo)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (userId)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_help_requests_manager_id ON help_requests (managerId)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions (userId)');
}

module.exports = { ensureCoreSchema };
