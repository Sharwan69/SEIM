const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const connectDatabase = require('./config/db');
const logger = require('./config/logger');
const env = require('./config/env');

const eventRoutes = require('./routes/events');
const alertRoutes = require('./routes/alerts');
const dashboardRoutes = require('./routes/dashboard');
const authRoutes = require('./routes/auth');
const incidentRoutes = require('./routes/incidents');
const analyticsRoutes = require('./routes/analytics');
const searchRoutes = require('./routes/search');
const ruleRoutes = require('./routes/rules');
const reportRoutes = require('./routes/reports');
const exportRoutes = require('./routes/export');

const authMiddleware = require('./middleware/auth');
const adminOnly = require('./middleware/adminOnly');
const errorHandler = require('./middleware/errorHandler');
const {
  apiLimiter,
  authLimiter,
  validateInput,
  securityHeaders,
  auditLog
} = require('./middleware/security');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: env.clientUrl,
    methods: ['GET', 'POST', 'PUT']
  }
});

// Security middleware
app.use(securityHeaders);
app.use(cors({
  origin: env.clientUrl,
  credentials: true
}));

// Body parsing with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Input sanitization
app.use(validateInput);

// Audit logging
app.use(auditLog);

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

app.use((req, res, next) => {
  req.io = io;
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SEIM',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/export', exportRoutes);

app.get('/api/admin', authMiddleware, adminOnly, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      username: req.user.username,
      role: req.user.role
    }
  });
});

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Default route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/app.html'));
});

// Socket.IO events
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// Connect to database and start server
connectDatabase();

server.listen(env.port, () => {
  logger.info(`SEIM server running on http://localhost:${env.port}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, io, server };