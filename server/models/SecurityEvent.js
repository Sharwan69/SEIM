const mongoose = require('mongoose');

const securityEventSchema = new mongoose.Schema({
  source: { type: String, required: true },
  sourceType: { type: String, default: 'Generic' },
  eventType: { type: String, required: true },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  message: { type: String, required: true },
  status: {
    type: String,
    enum: ['open', 'investigating', 'resolved'],
    default: 'open'
  },
  timestamp: { type: Date, default: Date.now },
  metadata: {
    type: Map,
    of: String,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('SecurityEvent', securityEventSchema);
