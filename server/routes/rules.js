const express = require('express');
const DetectionRule = require('../models/DetectionRule');
const logger = require('../config/logger');
const { verifyToken, requireAdmin } = require('./auth');

const router = express.Router();

const defaultRules = [
  {
    name: 'Brute Force Login Attack',
    description: 'Detects multiple failed login attempts from same source',
    ruleType: 'brute_force',
    severity: 'high',
    enabled: true,
    conditions: {
      eventType: 'login_failed',
      maxAttempts: 5,
      timeWindow: 300
    },
    actions: ['alert', 'block_ip', 'log']
  },
  {
    name: 'Port Scan Detection',
    description: 'Detects port scanning activities',
    ruleType: 'port_scan',
    severity: 'critical',
    enabled: true,
    conditions: {
      eventType: 'port_scan',
      maxAttempts: 10,
      timeWindow: 120
    },
    actions: ['alert', 'block_ip', 'notify_soc']
  },
  {
    name: 'Suspicious IP Activity',
    description: 'Tracks IPs with multiple security events',
    ruleType: 'suspicious_ip',
    severity: 'high',
    enabled: true,
    conditions: {
      maxAttempts: 5,
      timeWindow: 600
    },
    actions: ['alert', 'monitor', 'log']
  },
  {
    name: 'Malware Signature Hit',
    description: 'Alerts on malware detected by signatures',
    ruleType: 'malware',
    severity: 'critical',
    enabled: true,
    conditions: {
      eventType: 'malware_detected'
    },
    actions: ['alert', 'quarantine', 'notify_soc', 'block_ip']
  }
];

router.get('/', verifyToken, async (req, res) => {
  try {
    let rules = await DetectionRule.find();

    if (rules.length === 0) {
      await DetectionRule.insertMany(defaultRules);
      rules = await DetectionRule.find();
    }

    return res.json({
      success: true,
      count: rules.length,
      data: rules
    });
  } catch (error) {
    logger.error(`Failed to fetch rules: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to fetch rules' });
  }
});

router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const rule = new DetectionRule(req.body);
    await rule.save();

    logger.info(`Detection rule created: ${rule.name}`);
    return res.status(201).json({ success: true, data: rule });
  } catch (error) {
    logger.error(`Failed to create rule: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to create rule' });
  }
});

router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const rule = await DetectionRule.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });

    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }

    logger.info(`Detection rule updated: ${rule.name}`);
    return res.json({ success: true, data: rule });
  } catch (error) {
    logger.error(`Failed to update rule: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to update rule' });
  }
});

router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const rule = await DetectionRule.findByIdAndDelete(req.params.id);

    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }

    logger.info(`Detection rule deleted: ${rule.name}`);
    return res.json({ success: true, message: 'Rule deleted' });
  } catch (error) {
    logger.error(`Failed to delete rule: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to delete rule' });
  }
});

module.exports = router;
