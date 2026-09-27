const express = require('express');
const logger = require('../config/logger');
const { verifyToken, requireAdmin } = require('./auth');

const router = express.Router();

const collectors = new Map();

router.post('/register', async (req, res) => {
  const { name, type, hostname, version, config } = req.body;

  if (!name || !type) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const collectorId = `collector-${Date.now()}`;
  const collector = {
    id: collectorId,
    name,
    type,
    hostname,
    version,
    config,
    status: 'active',
    lastHeartbeat: new Date(),
    registeredAt: new Date(),
    eventCount: 0
  };

  collectors.set(collectorId, collector);
  logger.info(`Collector registered: ${name} (${type})`);

  return res.status(201).json({
    success: true,
    data: { id: collectorId, name, type }
  });
});

router.get('/', verifyToken, (req, res) => {
  const collectorList = Array.from(collectors.values());
  return res.json({
    success: true,
    count: collectorList.length,
    data: collectorList
  });
});

router.post('/:collectorId/heartbeat', (req, res) => {
  const { collectorId } = req.params;
  const collector = collectors.get(collectorId);

  if (!collector) {
    return res.status(404).json({ success: false, message: 'Collector not found' });
  }

  collector.lastHeartbeat = new Date();
  collector.status = 'active';
  collector.eventCount = req.body.eventCount || collector.eventCount;

  return res.json({
    success: true,
    message: 'Heartbeat received',
    data: collector
  });
});

router.get('/:collectorId', verifyToken, (req, res) => {
  const { collectorId } = req.params;
  const collector = collectors.get(collectorId);

  if (!collector) {
    return res.status(404).json({ success: false, message: 'Collector not found' });
  }

  return res.json({
    success: true,
    data: collector
  });
});

router.put('/:collectorId/config', verifyToken, requireAdmin, (req, res) => {
  const { collectorId } = req.params;
  const collector = collectors.get(collectorId);

  if (!collector) {
    return res.status(404).json({ success: false, message: 'Collector not found' });
  }

  collector.config = { ...collector.config, ...req.body };
  logger.info(`Collector config updated: ${collector.name}`);

  return res.json({
    success: true,
    data: collector
  });
});

router.delete('/:collectorId', verifyToken, requireAdmin, (req, res) => {
  const { collectorId } = req.params;
  const collector = collectors.get(collectorId);

  if (!collector) {
    return res.status(404).json({ success: false, message: 'Collector not found' });
  }

  collectors.delete(collectorId);
  logger.info(`Collector unregistered: ${collector.name}`);

  return res.json({
    success: true,
    message: 'Collector unregistered'
  });
});

module.exports = router;
