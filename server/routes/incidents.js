const express = require('express');
const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const SecurityEvent = require('../models/SecurityEvent');
const logger = require('../config/logger');

const router = express.Router();

// Get incident details with notes and timeline
router.get('/:id', async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id).lean();
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    // Get related alert if exists
    let relatedAlert = null;
    if (incident.relatedAlertId) {
      relatedAlert = await Alert.findById(incident.relatedAlertId).lean();
    }

    // Get related events
    const relatedEvents = await SecurityEvent.find({
      source: incident.source
    }).sort({ timestamp: -1 }).limit(10).lean();

    return res.json({
      success: true,
      data: {
        incident,
        relatedAlert,
        relatedEvents,
        timeline: [
          { type: 'created', timestamp: incident.createdAt, message: 'Incident created' },
          ...incident.notes.map(note => ({
            type: 'note',
            timestamp: note.createdAt,
            author: note.author,
            message: note.message
          }))
        ]
      }
    });
  } catch (error) {
    logger.error(`Failed to get incident: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to get incident' });
  }
});

// Add note to incident
router.post('/:id/notes', async (req, res) => {
  try {
    if (!req.body.message || !req.body.message.trim()) {
      return res.status(400).json({ success: false, message: 'Note message is required' });
    }

    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    incident.notes.push({
      author: req.body.author || req.user?.username || 'system',
      message: req.body.message.trim(),
      createdAt: new Date()
    });

    await incident.save();
    req.io.emit('incident-updated', incident);

    logger.info(`Note added to incident ${req.params.id}`);
    return res.json({ success: true, data: incident });
  } catch (error) {
    logger.error(`Failed to add note: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to add note' });
  }
});

// Update incident status and assignment
router.put('/:id', async (req, res) => {
  try {
    const allowed = ['title', 'description', 'severity', 'status', 'source', 'assignedTo'];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowed.includes(key))
    );

    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    req.io.emit('incident-updated', incident);
    logger.info(`Incident ${req.params.id} updated`);
    return res.json({ success: true, data: incident });
  } catch (error) {
    logger.error(`Failed to update incident: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to update incident' });
  }
});

// Export incidents to CSV
router.get('/export/csv', async (req, res) => {
  try {
    const incidents = await Incident.find().lean();

    let csv = 'Title,Severity,Status,Assigned To,Source,Created At\n';

    incidents.forEach(incident => {
      const createdDate = new Date(incident.createdAt).toISOString();
      csv += `"${incident.title}",${incident.severity},${incident.status},${incident.assignedTo},${incident.source},${createdDate}\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="incidents.csv"');
    return res.send(csv);
  } catch (error) {
    logger.error(`Failed to export incidents: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to export incidents' });
  }
});

module.exports = router;