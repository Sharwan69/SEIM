const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      totalEvents: 1284,
      criticalAlerts: 6,
      openIncidents: 12,
      resolvedToday: 34,
      bySeverity: {
        critical: 6,
        high: 18,
        medium: 42,
        low: 37
      },
      lastUpdated: new Date().toISOString()
    }
  });
});

module.exports = router;
