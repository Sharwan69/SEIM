const express = require('express');
const AuditLog = require('../models/AuditLog');
const logger = require('../config/logger');
const adminOnly = require('../middleware/adminOnly');

const router = express.Router();

// Get audit logs (admin only)
router.get('/', adminOnly, async (req, res) => {
  try {
    const { actor, action, limit = 100 } = req.query;
    const filters = {};

    if (actor) filters.actor = new RegExp(actor, 'i');
    if (action) filters.action = new RegExp(action, 'i');

    const logs = await AuditLog.find(filters)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    return res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    logger.error(`Failed to fetch audit logs: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

// Export audit logs to CSV (admin only)
router.get('/export/csv', adminOnly, async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).lean();

    let csv = 'Actor,Action,Entity,Entity ID,IP Address,Success,Created At\n';

    logs.forEach(log => {
      const createdDate = new Date(log.createdAt).toISOString();
      csv += `"${log.actor}","${log.action}","${log.entity}","${log.entityId}","${log.ipAddress}",${log.success},${createdDate}\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    return res.send(csv);
  } catch (error) {
    logger.error(`Failed to export audit logs: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to export audit logs' });
  }
});

// Get audit summary (admin only)
router.get('/summary', adminOnly, async (req, res) => {
  try {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalLogs, last24Logs, failedLogs, actorStats] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ createdAt: { $gte: last24h } }),
      AuditLog.countDocuments({ success: false }),
      AuditLog.aggregate([
        {
          $group: {
            _id: '$actor',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    return res.json({
      success: true,
      data: {
        totalLogs,
        last24Logs,
        failedLogs,
        actorStats
      }
    });
  } catch (error) {
    logger.error(`Failed to fetch audit summary: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to fetch audit summary' });
  }
});

module.exports = router;