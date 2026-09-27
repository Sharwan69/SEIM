const mongoose = require('mongoose');

const detectionRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    enabled: { type: Boolean, default: true },
    ruleType: {
      type: String,
      enum: ['brute_force', 'port_scan', 'suspicious_ip', 'malware', 'custom'],
      required: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'high'
    },
    conditions: {
      eventType: String,
      maxAttempts: Number,
      timeWindow: Number,
      sourceType: String
    },
    actions: [String],
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DetectionRule', detectionRuleSchema);
