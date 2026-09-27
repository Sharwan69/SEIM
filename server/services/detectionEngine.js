const Alert = require('../models/Alert');
const SuspiciousIP = require('../models/SuspiciousIP');
const SecurityEvent = require('../models/SecurityEvent');
const logger = require('../config/logger');

const detectionEngine = {
  async detectBruteForce(event, io) {
    if (event.eventType !== 'login_failed') return null;

    const timeWindow = 5 * 60 * 1000;
    const threshold = 5;

    try {
      const failedAttempts = await SecurityEvent.countDocuments({
        source: event.source,
        eventType: 'login_failed',
        timestamp: { $gte: new Date(Date.now() - timeWindow) }
      });

      if (failedAttempts >= threshold) {
        const alert = new Alert({
          title: `Brute Force Attack Detected: ${event.source}`,
          severity: failedAttempts >= 10 ? 'critical' : 'high',
          status: 'open',
          source: event.source,
          description: `${failedAttempts} failed login attempts from ${event.source} in 5 minutes`
        });

        await alert.save();
        io.emit('new-alert', alert);
        logger.warn(`Brute force detected on ${event.source}: ${failedAttempts} attempts`);
        return alert;
      }
    } catch (error) {
      logger.error(`Brute force detection failed: ${error.message}`);
    }

    return null;
  },

  async detectSuspiciousIP(event, io) {
    if (event.eventType !== 'login_failed' && event.eventType !== 'port_scan') return null;

    try {
      let suspiciousIP = await SuspiciousIP.findOne({ ipAddress: event.source });

      if (!suspiciousIP) {
        suspiciousIP = new SuspiciousIP({
          ipAddress: event.source,
          reason: `Multiple ${event.eventType} events`,
          failedAttempts: 1,
          severity: 'medium'
        });
      } else {
        suspiciousIP.failedAttempts += 1;
        suspiciousIP.lastSeen = new Date();

        if (suspiciousIP.failedAttempts >= 10) {
          suspiciousIP.severity = 'critical';
          suspiciousIP.blocked = true;
        } else if (suspiciousIP.failedAttempts >= 5) {
          suspiciousIP.severity = 'high';
        }
      }

      await suspiciousIP.save();

      if (suspiciousIP.failedAttempts >= 5) {
        const alert = new Alert({
          title: `Suspicious IP Detected: ${event.source}`,
          severity: suspiciousIP.severity,
          status: 'open',
          source: event.source,
          description: `IP ${event.source} has ${suspiciousIP.failedAttempts} suspicious events`
        });

        await alert.save();
        io.emit('new-alert', alert);
        logger.warn(`Suspicious IP tracked: ${event.source} (${suspiciousIP.failedAttempts} attempts)`);
        return alert;
      }
    } catch (error) {
      logger.error(`Suspicious IP detection failed: ${error.message}`);
    }

    return null;
  },

  async detectPortScan(event, io) {
    if (event.eventType !== 'port_scan') return null;

    try {
      const portScanCount = await SecurityEvent.countDocuments({
        source: event.source,
        eventType: 'port_scan',
        timestamp: { $gte: new Date(Date.now() - 2 * 60 * 1000) }
      });

      if (portScanCount >= 10) {
        const alert = new Alert({
          title: `Port Scan Activity Detected: ${event.source}`,
          severity: 'critical',
          status: 'open',
          source: event.source,
          description: `Port scanning activity from ${event.source} (${portScanCount} attempts in 2 minutes)`
        });

        await alert.save();
        io.emit('new-alert', alert);
        logger.error(`Port scan detected on ${event.source}: ${portScanCount} attempts`);
        return alert;
      }
    } catch (error) {
      logger.error(`Port scan detection failed: ${error.message}`);
    }

    return null;
  },

  async processEvent(event, io) {
    await Promise.all([
      this.detectBruteForce(event, io),
      this.detectSuspiciousIP(event, io),
      this.detectPortScan(event, io)
    ]);
  }
};

module.exports = detectionEngine;
