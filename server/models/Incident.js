const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['new', 'open', 'investigating', 'mitigated', 'resolved'],
      default: 'new'
    },
    source: { type: String, default: 'unknown' },
    assignedTo: { type: String, default: 'unassigned' },
    relatedAlertId: { type: mongoose.Schema.Types.ObjectId, ref: 'Alert', default: null },
    notes: [
      {
        author: String,
        message: String,
        createdAt: { type: Date, default: Date.now }
      }
    ],
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Incident', incidentSchema);
