const express = require('express');
const SuspiciousIP = require('../models/SuspiciousIP');
const logger = require('../config/logger');
const { verifyToken, requireAdmin } = require('./auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const suspiciousIPs = await SuspiciousIP.find().sort({ failedAttempts: -1 }).limit(100);
    return res.json({
      success: true,
      count: suspiciousIPs.length,
      data: suspiciousIPs
    });
  } catch (error) {
    logger.error(`Failed to fetch suspicious IPs: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to fetch IPs' });
  }
});

router.post('/block/:ipAddress', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { ipAddress } = req.params;
    const suspiciousIP = await SuspiciousIP.findOneAndUpdate(
      { ipAddress },
      { blocked: true },
      { new: true }
    );

    if (!suspiciousIP) {
      return res.status(404).json({ success: false, message: 'IP not found' });
    }

    logger.info(`IP blocked: ${ipAddress}`);
    return res.json({ success: true, data: suspiciousIP });
  } catch (error) {
    logger.error(`Failed to block IP: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to block IP' });
  }
});

router.post('/unblock/:ipAddress', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { ipAddress } = req.params;
    const suspiciousIP = await SuspiciousIP.findOneAndUpdate(
      { ipAddress },
      { blocked: false },
      { new: true }
    );

    if (!suspiciousIP) {
      return res.status(404).json({ success: false, message: 'IP not found' });
    }

    logger.info(`IP unblocked: ${ipAddress}`);
    return res.json({ success: true, data: suspiciousIP });
  } catch (error) {
    logger.error(`Failed to unblock IP: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to unblock IP' });
  }
});

module.exports = router;
