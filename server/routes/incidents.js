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
    const incident = await Incident.create({
      title: req.body.title || 'New incident',
      description: req.body.description || '',
      severity: req.body.severity || 'medium',
      status: req.body.status || 'new',
      source: req.body.source || 'unknown',
      assignedTo: req.body.assignedTo || 'unassigned',
      relatedAlertId: req.body.relatedAlertId || null
    });
    req.io.emit('incident-created', incident);
    return res.status(201).json({ success: true, data: incident });
  } catch (error) {
    logger.error(`Failed to create incident: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to create incident' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const allowed = ['title', 'description', 'severity', 'status', 'source', 'assignedTo'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const incident = await Incident.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });
    req.io.emit('incident-updated', incident);
    return res.json({ success: true, data: incident });
  } catch (error) {
    logger.error(`Failed to update incident: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to update incident' });
  }
});

router.post('/:id/notes', async (req, res) => {
  try {
    if (!req.body.message || !req.body.message.trim()) {
      return res.status(400).json({ success: false, message: 'Note message is required' });
    }
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });
    incident.notes.push({ author: req.body.author || 'system', message: req.body.message.trim() });
    await incident.save();
    req.io.emit('incident-updated', incident);
    return res.json({ success: true, data: incident });
  } catch (error) {
    logger.error(`Failed to add note: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to add note' });
  }
});

module.exports = router;
