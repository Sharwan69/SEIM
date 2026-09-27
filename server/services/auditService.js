const AuditLog = require('../models/AuditLog');
const logger = require('../config/logger');

const logAction = async (actor, action, entity, entityId, details = {}, ipAddress = '', success = true) => {
  try {
    await AuditLog.create({
      actor,
      action,
      entity,
      entityId,
      details,
      ipAddress,
      success
    });
  } catch (error) {
    logger.error(`Failed to log audit: ${error.message}`);
  }
};

const auditMiddleware = (action, entity) => {
  return async (req, res, next) => {
    const originalJson = res.json;

    res.json = function (data) {
      const actor = req.user?.username || 'anonymous';
      const ipAddress = req.ip || req.connection.remoteAddress;
      const success = !data.error && data.success !== false;
      const entityId = req.params.id || '';

      logAction(actor, action, entity, entityId, { method: req.method }, ipAddress, success);

      res.json = originalJson;
      return res.json(data);
    };

    next();
  };
};

module.exports = { logAction, auditMiddleware };