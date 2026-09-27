const express = require('express');
const Rule = require('../models/Rule');
const logger = require('../config/logger');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const rules = await Rule.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, count: rules.length, data: rules });
  } catch (error) {
    logger.error(`Failed to fetch rules: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to fetch rules' });
  }
});

router.post('/', async (req, res) => {
  try {
    const rule = await Rule.create({
      name: req.body.name || 'New rule',
      description: req.body.description || '',
      eventType: req.body.eventType || 'custom_event',
      severity: req.body.severity || 'high',
      threshold: req.body.threshold || 1,
      enabled: req.body.enabled !== undefined ? req.body.enabled : true
    });

    return res.status(201).json({ success: true, data: rule });
  } catch (error) {
    logger.error(`Failed to create rule: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to create rule' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const rule = await Rule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }
    return res.json({ success: true, data: rule });
  } catch (error) {
    logger.error(`Failed to update rule: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to update rule' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const rule = await Rule.findByIdAndDelete(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }
    return res.json({ success: true, message: 'Rule deleted' });
  } catch (error) {
    logger.error(`Failed to delete rule: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to delete rule' });
  }
});

module.exports = router;