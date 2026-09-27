const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const logger = require('../config/logger');

// Rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Limit login attempts
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true
});

// Input validation middleware
const validateInput = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      const value = req.body[key];
      if (typeof value === 'string') {
        // Remove potential XSS characters
        req.body[key] = value
          .replace(/[<>"']/g, '')
          .substring(0, 5000); // Limit string length
      }
    }
  }
  next();
};

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Audit logging middleware
const auditLog = (req, res, next) => {
  const originalSend = res.send;

  res.send = function (data) {
    const user = req.user?.username || 'anonymous';
    const method = req.method;
    const path = req.path;
    const status = res.statusCode;

    if ([200, 201].includes(status)) {
      logger.info(`[AUDIT] ${user} ${method} ${path} - ${status}`);
    } else if (status >= 400) {
      logger.warn(`[AUDIT] ${user} ${method} ${path} - ${status}`);
    }

    res.send = originalSend;
    return res.send(data);
  };

  next();
};

module.exports = {
  apiLimiter,
  authLimiter,
  validateInput,
  securityHeaders,
  auditLog
};