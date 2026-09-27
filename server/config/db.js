const mongoose = require('mongoose');
const logger = require('./logger');

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/siem';

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    logger.info(`MongoDB connected: ${mongoUri}`);
  } catch (error) {
    logger.warn(`MongoDB connection failed. Continuing in demo mode: ${error.message}`);
  }
}

module.exports = connectDatabase;
