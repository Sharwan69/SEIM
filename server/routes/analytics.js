const express = require('express');
const Alert = require('../models/Alert');
const SecurityEvent = require('../models/SecurityEvent');

const router = express.Router();

function lastNDays(days) {
  const result = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    result.push({
      date: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      total: 0
    });
  }
  return result;
}

router.get('/overview', async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 31);
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const trend = lastNDays(days);

  try {
    const [alerts, eventCounts] = await Promise.all([
      Alert.find({ createdAt: { $gte: start } }).lean(),
      SecurityEvent.aggregate([
        { $match: { timestamp: { $gte: start } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            total: { $sum: 1 }
          }
        }
      ])
    ]);

    alerts.forEach((alert) => {
      const row = trend.find((entry) => entry.date === new Date(alert.createdAt).toISOString().slice(0, 10));
      if (row && Object.prototype.hasOwnProperty.call(row, alert.severity)) row[alert.severity] += 1;
    });

    eventCounts.forEach((item) => {
      const row = trend.find((entry) => entry.date === item._id);
      if (row) row.total = item.total;
    });

    return res.json({ success: true, data: { alertTrend: trend, eventTrend: trend } });
  } catch (error) {
    return res.json({ success: true, data: { alertTrend: trend, eventTrend: trend } });
  }
});

module.exports = router;
