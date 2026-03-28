require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
// mongoSanitize removed due to Express 5 incompatibility
const taskCleanupCron = require('./cron/taskCleanup');
const { connectDB, pool } = require('./config/db');
const { ensureCoreSchema } = require('./config/schema');
const { ensureLocalBootstrap } = require('./utils/localBootstrap');
const { findUserBySessionToken } = require('./utils/sessionToken');
const Department = require('./models/Department');
const Task = require('./models/Task');

const app = express();
const server = http.createServer(app);

// Trust proxy for Render/Railway (required for rate limiting)
app.set('trust proxy', 1);

// Permissive CORS for local development and same app deployed from different origins.
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  // Explicitly handle all OPTIONS requests to prevent 404s on preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
});

// Standard security headers
app.use(helmet({
  contentSecurityPolicy: false,
  // Allow images/files to be embedded from this server by a different origin (e.g., Vite dev server)
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));

// Configure Socket.io
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

// Socket.io session-token middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error - No token'));

  findUserBySessionToken(token)
    .then((user) => {
      if (!user) {
        return next(new Error('Authentication error - Invalid token'));
      }

      socket.userId = user._id;
      socket.userRole = String(user.role || '').toLowerCase();
      next();
    })
    .catch(() => next(new Error('Authentication error - Invalid token')));
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.userId}`);
  // Join personal user room
  socket.join(String(socket.userId));
  socket.join(`user_${socket.userId}`);
  
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.userId}`);
  });
});

// Pass io to request object for use in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Logging
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

// CRITICAL: Body parser MUST be before sanitization middlewares!
app.use(express.json({ limit: '20mb' }));

// Removing express-mongo-sanitize because it crashes Express 5 (req.query is read-only)

// Security: Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased for dev testing
  message: { message: 'Too many requests from this IP.' }
});
app.use('/api/', limiter);

// Stricter Rate Limit for Auth
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1000, // Increased from 20 for development
  message: { message: 'Too many login attempts.' }
});
app.use('/api/auth/login', authLimiter);

// Routes setup will go here
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/help-requests', require('./routes/helpRequests'));
app.use('/api', require('./routes/departments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/manager', require('./routes/manager'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/push', require('./routes/push'));

// Simple healthcheck route
app.get('/health', (req, res) => res.json({ status: 'ok', server: 'TaskFlow Cyber Backend - VERIFIED' }));

// Start Cron Jobs
taskCleanupCron();

// CRITICAL: Global Error Handler to catch middleware or unhandled promise crashes
app.use((err, req, res, next) => {
  console.error('GLOBAL EXPRESS ERROR:', err);
  res.status(500).json({
    error: 'Global Server Error',
    message: err.message || 'Unknown error occurred in middleware',
    stack: err.stack
  });
});

async function startServer() {
  try {
    // Database connection
    await connectDB();
    await ensureCoreSchema(pool);
    await ensureLocalBootstrap();

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT} at 0.0.0.0`);
    });
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
}

startServer();
