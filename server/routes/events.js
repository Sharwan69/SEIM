const express = require('express');
const SecurityEvent = require('../models/SecurityEvent');
const logger = require('../config/logger');

const router = express.Router();

const demoEvents = [
  {
    _id: '1',
    source: 'auth-server-01',
    sourceType: 'Linux Server',
    eventType: 'login_failed',
    severity: 'high',
    message: 'Failed login attempt for admin from 10.0.0.15',
    status: 'open',
    timestamp: new Date().toISOString()
  },
  {
    _id: '2',
    source: 'fw-core-01',
    sourceType: 'Firewall',
    eventType: 'port_scan',
    severity: 'critical',
    message: 'Multiple suspicious connection attempts detected',
    status: 'investigating',
    timestamp: new Date().toISOString()
  },
  {
    _id: '3',
    source: 'web-gateway',
    sourceType: 'Web Application',
    eventType: 'suspicious_request',
    severity: 'medium',
    message: 'Repeated malformed HTTP requests from external IP',
    status: 'resolved',
    timestamp: new Date().toISOString()
  }
];

router.get('/', async (req, res) => {
  try {
    const events = await SecurityEvent.find().sort({ timestamp: -1 }).lean();
    return res.json({ success: true, count: events.length, data: events });
  } catch (error) {
    logger.warn(`Falling back to demo events: ${error.message}`);
    return res.json({ success: true, count: demoEvents.length, data: demoEvents });
  }
});

router.post('/', async (req, res) => {
  try {
    const event = new SecurityEvent({
      source: req.body.source || 'unknown-source',
      sourceType: req.body.sourceType || 'Generic',
      eventType: req.body.eventType || 'custom_event',
      severity: req.body.severity || 'medium',
      message: req.body.message || 'New event received',
      status: req.body.status || 'open',
      metadata: req.body.metadata || {}
    });

    const saved = await event.save();
    req.io.emit('new-event', saved);

    logger.info(`New event ingested: ${saved.eventType}`);
    return res.status(201).json({ success: true, data: saved });
  } catch (error) {
    logger.error(`Event creation failed: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to create event' });
  }
});

module.exports = router;
