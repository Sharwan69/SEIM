const express = require('express');
const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const SecurityEvent = require('../models/SecurityEvent');
const logger = require('../config/logger');
const adminOnly = require('../middleware/adminOnly');

const router = express.Router();

// Get report summary
router.get('/summary', async (req, res) => {
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
      topSources: [...new Set(incidents.map(i => i.source))].slice(0, 10),
      resolvedIncidents: incidents.filter(i => i.status === 'resolved').length,
      avgIncidentSeverity: incidents.length > 0 ? (incidents.filter(i => i.severity === 'critical').length * 4 + incidents.filter(i => i.severity === 'high').length * 3 + incidents.filter(i => i.severity === 'medium').length * 2 + incidents.filter(i => i.severity === 'low').length) / incidents.length : 0
    };

    return res.json({ success: true, data: report });
  } catch (error) {
    logger.error(`Failed to generate report: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
});

// Export incidents report to CSV
router.get('/incidents/export', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filters = {};

    if (startDate) filters.createdAt = { $gte: new Date(startDate) };
    if (endDate) {
      if (!filters.createdAt) filters.createdAt = {};
      filters.createdAt.$lte = new Date(endDate);
    }

    const incidents = await Incident.find(filters).lean();

    let csv = 'Title,Severity,Status,Assigned To,Source,Notes Count,Created At\n';

    incidents.forEach(incident => {
      const createdDate = new Date(incident.createdAt).toISOString();
      const notesCount = (incident.notes || []).length;
      csv += `"${incident.title}",${incident.severity},${incident.status},${incident.assignedTo},${incident.source},${notesCount},${createdDate}\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="incidents-report-${Date.now()}.csv"`);
    return res.send(csv);
  } catch (error) {
    logger.error(`Failed to export report: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to export report' });
  }
});

// Export alerts report to CSV
router.get('/alerts/export', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filters = {};

    if (startDate) filters.createdAt = { $gte: new Date(startDate) };
    if (endDate) {
      if (!filters.createdAt) filters.createdAt = {};
      filters.createdAt.$lte = new Date(endDate);
    }

    const alerts = await Alert.find(filters).lean();

    let csv = 'Title,Severity,Status,Source,Description,Created At\n';

    alerts.forEach(alert => {
      const createdDate = new Date(alert.createdAt).toISOString();
      csv += `"${alert.title}",${alert.severity},${alert.status},${alert.source},"${alert.description || ''}",${createdDate}\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="alerts-report-${Date.now()}.csv"`);
    return res.send(csv);
  } catch (error) {
    logger.error(`Failed to export alerts report: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to export alerts report' });
  }
});

module.exports = router;