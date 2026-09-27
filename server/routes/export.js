const express = require('express');
const Alert = require('../models/Alert');
const Incident = require('../models/Incident');
const SecurityEvent = require('../models/SecurityEvent');
const logger = require('../config/logger');

const router = express.Router();

// Export alerts to CSV
router.get('/alerts/export', async (req, res) => {
  try {
    const alerts = await Alert.find().lean();

    let csv = 'Title,Severity,Status,Source,Description,Created At\n';

    alerts.forEach(alert => {
      const createdDate = new Date(alert.createdAt).toISOString();
      csv += `"${alert.title}",${alert.severity},${alert.status},${alert.source},"${alert.description}",${createdDate}\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="alerts.csv"');
    return res.send(csv);
  } catch (error) {
    logger.error(`Failed to export alerts: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to export alerts' });
  }
});

// Export events to CSV
router.get('/events/export', async (req, res) => {
  try {
    const events = await SecurityEvent.find().lean();

    let csv = 'Source,Event Type,Severity,Message,Status,Timestamp\n';

    events.forEach(event => {
      const timestamp = new Date(event.timestamp).toISOString();
      csv += `${event.source},${event.eventType},${event.severity},"${event.message}",${event.status},${timestamp}\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="events.csv"');
    return res.send(csv);
  } catch (error) {
    logger.error(`Failed to export events: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to export events' });
  }
});

// Generate incident report
router.get('/report', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filters = {};

    if (startDate) filters.createdAt = { $gte: new Date(startDate) };
    if (endDate) {
      if (!filters.createdAt) filters.createdAt = {};
      filters.createdAt.$lte = new Date(endDate);
    }

    const [incidents, alerts, events] = await Promise.all([
      Incident.find(filters).lean(),
      Alert.find(filters).lean(),
      SecurityEvent.find({ timestamp: filters.createdAt }).lean()
    ]);

    const report = {
      generatedAt: new Date().toISOString(),
      period: `${startDate || 'all time'} to ${endDate || 'now'}`,
      summary: {
        totalIncidents: incidents.length,
        totalAlerts: alerts.length,
        totalEvents: events.length
      },
      bySeverity: {
        critical: incidents.filter(i => i.severity === 'critical').length,
        high: incidents.filter(i => i.severity === 'high').length,
        medium: incidents.filter(i => i.severity === 'medium').length,
        low: incidents.filter(i => i.severity === 'low').length
      },
      byStatus: {
        new: incidents.filter(i => i.status === 'new').length,
        open: incidents.filter(i => i.status === 'open').length,
        investigating: incidents.filter(i => i.status === 'investigating').length,
        mitigated: incidents.filter(i => i.status === 'mitigated').length,
        resolved: incidents.filter(i => i.status === 'resolved').length
      },
      topSources: [...new Set(incidents.map(i => i.source))].slice(0, 10)
    };

    return res.json({ success: true, data: report });
  } catch (error) {
    logger.error(`Failed to generate report: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
});

module.exports = router;