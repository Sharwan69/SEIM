const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const connectDatabase = require('./config/db');
const logger = require('./config/logger');
const eventRoutes = require('./routes/events');
const alertRoutes = require('./routes/alerts');
const dashboardRoutes = require('./routes/dashboard');
const suspiciousIPRoutes = require('./routes/suspiciousIPs');
const rulesRoutes = require('./routes/rules');
const { router: authRoutes } = require('./routes/auth');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SEIM',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/suspicious-ips', suspiciousIPRoutes);
app.use('/api/rules', rulesRoutes);

app.use(express.static(path.join(__dirname, '../public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

connectDatabase();

server.listen(PORT, () => {
  logger.info(`SEIM server running on http://localhost:${PORT}`);
  logger.info(`API Endpoints:`);
  logger.info(`  POST /api/auth/register - Register new user`);
  logger.info(`  POST /api/auth/login - Login and get JWT token`);
  logger.info(`  GET /api/events - Get all security events`);
  logger.info(`  POST /api/events - Ingest new security event`);
  logger.info(`  GET /api/alerts - Get all alerts`);
  logger.info(`  GET /api/dashboard - Get dashboard metrics`);
  logger.info(`  GET /api/suspicious-ips - Get suspicious IPs (requires auth)`);
  logger.info(`  POST /api/suspicious-ips/block/:ipAddress - Block IP (admin only)`);
  logger.info(`  GET /api/rules - Get detection rules (requires auth)`);
  logger.info(`  POST /api/rules - Create new detection rule (admin only)`);
});

module.exports = { app, io, server };
