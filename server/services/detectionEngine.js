const Alert = require('../models/Alert');

function normalizeEvent(event) {
  return {
    source: event.source || 'unknown-source',
    sourceType: event.sourceType || 'Generic',
    eventType: event.eventType || 'custom_event',
    severity: event.severity || 'medium',
    message: event.message || 'Security event detected',
    timestamp: new Date()
  };
}

async function createAlertIfNeeded(alertData) {
  try {
    const alert = await Alert.create({
      title: alertData.title,
      severity: alertData.severity || 'medium',
      status: 'open',
      source: alertData.source || 'unknown',
      description: alertData.description || ''
    });

    return alert;
  } catch (err) {
    return null;
  }
}

async function evaluateSecurityEvent(event) {
  const normalized = normalizeEvent(event);
  const rules = [];

  if (normalized.eventType === 'login_failed') {
    rules.push({
      title: 'Brute force login attempt detected',
      severity: 'high',
      source: normalized.source,
      description: `Multiple failed logins from ${normalized.source}`
    });
  }

  if (normalized.eventType === 'port_scan') {
    rules.push({
      title: 'Port scan detected',
      severity: 'critical',
      source: normalized.source,
      description: 'Host is probing multiple ports in a short time window'
    });
  }

  if (normalized.eventType === 'suspicious_request') {
    rules.push({
      title: 'Suspicious request pattern detected',
      severity: 'medium',
      source: normalized.source,
      description: 'Abnormal request pattern detected by application layer filters'
    });
  }

  if (normalized.eventType === 'malware_signature') {
    rules.push({
      title: 'Malware signature match',
      severity: 'critical',
      source: normalized.source,
      description: 'Malware signature hit on monitored endpoint'
    });
  }

  const created = [];

  for (const rule of rules) {
    const alert = await createAlertIfNeeded(rule);
    if (alert) created.push(alert);
  }

  return created;
}

module.exports = {
  evaluateSecurityEvent
};
