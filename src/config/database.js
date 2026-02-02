/**
 * MongoDB Database Configuration
 * Handles MongoDB connection using Mongoose
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  `mongodb://${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '27017'}/${process.env.DB_NAME || 'car_inspection_db'}`;

const safeMongoUriForLogs = (uri) => {
  if (!uri) return 'MONGODB_URI is not set';
  // remove credentials if present: mongodb+srv://user:pass@host/db -> mongodb+srv://***:***@host/db
  return uri.replace(/\/\/([^:/]+):([^@]+)@/g, '//***:***@');
};
// Connection options
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

// Test database connection
const connectDB = async () => {
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('Database already connected.');
      return;
    }

    console.log('Connecting to MongoDB:', safeMongoUriForLogs(MONGODB_URI));
    await mongoose.connect(MONGODB_URI, options);
    console.log('MongoDB connection established successfully.');
    if (mongoose.connection?.name) {
      console.log('MongoDB database name:', mongoose.connection.name);
    }
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
  } catch (error) {
    console.error('Unable to connect to MongoDB:', error);
    throw error;
  }
};

// Close database connection
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    throw error;
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  mongoose
};