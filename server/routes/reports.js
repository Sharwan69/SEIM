const express = require('express');
const Alert = require('../models/Alert');
const Incident = require('../models/Incident');
const SecurityEvent = require('../models/SecurityEvent');
const logger = require('../config/logger');

const router = express.Router();

async function generateWeeklyReport() {
  const now = new Date();
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [alerts, incidents, events] = await Promise.all([
    Alert.find({ createdAt: { $gte: lastWeek } }).lean(),
    Incident.find({ createdAt: { $gte: lastWeek } }).lean(),
    SecurityEvent.find({ timestamp: { $gte: lastWeek } }).lean()
  ]);

  return {
    generatedAt: now.toISOString(),
    period: `${lastWeek.toDateString()} to ${now.toDateString()}`,
    alertCount: alerts.length,
    incidentCount: incidents.length,
    eventCount: events.length,
    bySeverity: {
      critical: alerts.filter((a) => a.severity === 'critical').length,
      high: alerts.filter((a) => a.severity === 'high').length,
      medium: alerts.filter((a) => a.severity === 'medium').length,
      low: alerts.filter((a) => a.severity === 'low').length
    },
    byStatus: {
      open: incidents.filter((i) => i.status === 'open').length,
      investigating: incidents.filter((i) => i.status === 'investigating').length,
      resolved: incidents.filter((i) => i.status === 'resolved').length
    }
  };
}

router.get('/weekly', async (req, res) => {
  try {
    const report = await generateWeeklyReport();
    return res.json({ success: true, data: report });
  } catch (error) {
    logger.error(`Failed to generate report: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const [alerts, incidents, events] = await Promise.all([
      Alert.find().lean(),
      Incident.find().lean(),
      SecurityEvent.find().lean()
    ]);

    return res.json({
      success: true,
      data: {
        totalAlerts: alerts.length,
        totalIncidents: incidents.length,
        totalEvents: events.length,
        criticalAlerts: alerts.filter((a) => a.severity === 'critical').length,
        resolvedIncidents: incidents.filter((i) => i.status === 'resolved').length
      }
    });
  } catch (error) {
    logger.error(`Failed to fetch summary: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to fetch summary' });
  }
});

module.exports = router;