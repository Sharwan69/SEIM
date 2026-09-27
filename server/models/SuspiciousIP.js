const mongoose = require('mongoose');

const suspiciousIPSchema = new mongoose.Schema(
  {
    ipAddress: { type: String, required: true, unique: true },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    reason: String,
    failedAttempts: { type: Number, default: 0 },
    lastSeen: { type: Date, default: Date.now },
    blocked: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SuspiciousIP', suspiciousIPSchema);
