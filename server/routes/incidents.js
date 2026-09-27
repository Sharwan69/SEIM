const express = require('express');
const Incident = require('../models/Incident');
const logger = require('../config/logger');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const incidents = await Incident.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, count: incidents.length, data: incidents });
  } catch (error) {
    logger.error(`Failed to fetch incidents: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to fetch incidents' });
  }
});

router.post('/', async (req, res) => {
  try {
    const incident = new Incident({
      title: req.body.title || 'New incident',
      description: req.body.description || '',
      severity: req.body.severity || 'medium',
      status: req.body.status || 'new',
      source: req.body.source || 'unknown',
      assignedTo: req.body.assignedTo || 'unassigned',
      relatedAlertId: req.body.relatedAlertId || null
    });

    const saved = await incident.save();
    return res.status(201).json({ success: true, data: saved });
  } catch (error) {
    logger.error(`Failed to create incident: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to create incident' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const incident = await Incident.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }
    return res.json({ success: true, data: incident });
  } catch (error) {
    logger.error(`Failed to update incident: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to update incident' });
  }
});

router.post('/:id/notes', async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    incident.notes.push({
      author: req.body.author || 'system',
      message: req.body.message || '',
      createdAt: new Date()
    });

    await incident.save();
    return res.json({ success: true, data: incident });
  } catch (error) {
    logger.error(`Failed to add note: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to add note' });
  }
});

module.module = router;
