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
const authRoutes = require('./routes/auth');
const incidentRoutes = require('./routes/incidents');
const analyticsRoutes = require('./routes/analytics');
const authMiddleware = require('./middleware/auth');

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || '*', methods: ['GET', 'POST', 'PUT'] } });
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => { req.io = io; next(); });

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'SEIM', timestamp: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.get('/api/admin', authMiddleware, (req, res) => res.json({ success: true, user: { id: req.user._id, username: req.user.username, role: req.user.role } }));

app.use(express.static(path.join(__dirname, '../public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  socket.on('disconnect', () => logger.info(`Client disconnected: ${socket.id}`));
});

connectDatabase();
server.listen(PORT, () => logger.info(`SEIM server running on http://localhost:${PORT}`));
module.exports = { app, io, server };
