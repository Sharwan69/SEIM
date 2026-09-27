const express = require('express');
const SecurityEvent = require('../models/SecurityEvent');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const {
      source,
      eventType,
      severity,
      status,
      q
    } = req.query;

    const filters = {};

    if (source) filters.source = new RegExp(source, 'i');
    if (eventType) filters.eventType = new RegExp(eventType, 'i');
    if (severity) filters.severity = severity;
    if (status) filters.status = status;

    if (q) {
      filters.$or = [
        { source: new RegExp(q, 'i') },
        { eventType: new RegExp(q, 'i') },
        { message: new RegExp(q, 'i') }
      ];
    }

    const events = await SecurityEvent.find(filters).sort({ timestamp: -1 }).limit(200).lean();
    return res.json({ success: true, count: events.length, data: events });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to search events' });
  }
});

module.exports = router;