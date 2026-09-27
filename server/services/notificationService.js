const nodemailer = require('nodemailer');
const logger = require('../config/logger');

// Configure email transporter (use environment variables for production)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  } : undefined
});

async function sendCriticalAlertNotification(alert) {
  try {
    if (alert.severity !== 'critical') return;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'siem@company.com',
      to: process.env.ALERT_EMAIL || 'security@company.com',
      subject: `[CRITICAL] ${alert.title}`,
      html: `
        <h2>Critical Security Alert</h2>
        <p><strong>Title:</strong> ${alert.title}</p>
        <p><strong>Severity:</strong> ${alert.severity}</p>
        <p><strong>Source:</strong> ${alert.source}</p>
        <p><strong>Description:</strong> ${alert.description || 'N/A'}</p>
        <p><strong>Status:</strong> ${alert.status}</p>
        <p><strong>Created:</strong> ${new Date(alert.createdAt).toISOString()}</p>
        <hr />
        <p><a href="${process.env.SIEM_URL || 'http://localhost:5000'}/app.html">View in SEIM Dashboard</a></p>
      `
    };

    if (process.env.SMTP_HOST) {
      await transporter.sendMail(mailOptions);
      logger.info(`Alert notification sent for ${alert.title}`);
    } else {
      logger.info(`[MOCK EMAIL] Would send alert: ${alert.title}`);
    }
  } catch (error) {
    logger.error(`Failed to send alert notification: ${error.message}`);
  }
}

async function sendIncidentAssignmentNotification(incident, assignedUser) {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'siem@company.com',
      to: assignedUser.email || 'analyst@company.com',
      subject: `Incident Assigned: ${incident.title}`,
      html: `
        <h2>Incident Assignment</h2>
        <p>You have been assigned to the following incident:</p>
        <p><strong>Title:</strong> ${incident.title}</p>
        <p><strong>Severity:</strong> ${incident.severity}</p>
        <p><strong>Description:</strong> ${incident.description || 'N/A'}</p>
        <p><strong>Status:</strong> ${incident.status}</p>
        <hr />
        <p><a href="${process.env.SIEM_URL || 'http://localhost:5000'}/app.html">View in SEIM Dashboard</a></p>
      `
    };

    if (process.env.SMTP_HOST) {
      await transporter.sendMail(mailOptions);
      logger.info(`Assignment notification sent to ${assignedUser.email}`);
    } else {
      logger.info(`[MOCK EMAIL] Would send assignment: ${incident.title} to ${assignedUser.email}`);
    }
  } catch (error) {
    logger.error(`Failed to send assignment notification: ${error.message}`);
  }
}

module.exports = {
  sendCriticalAlertNotification,
  sendIncidentAssignmentNotification
};