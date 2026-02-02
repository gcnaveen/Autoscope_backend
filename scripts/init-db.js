/**
 * Database initialization script (Optional for MongoDB)
 * MongoDB creates collections automatically on first insert
 * This script is kept for consistency but MongoDB doesn't require explicit table creation
 * 
 * Usage: node scripts/init-db.js
 */

require('dotenv').config();
const { connectDB, disconnectDB } = require('../src/config/database');

const initDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    
    console.log('Database connection established successfully!');
    console.log('\nNote: MongoDB creates collections automatically on first insert.');
    console.log('No explicit table/collection creation needed.');
    console.log('\nCollections will be created when you:');
    console.log('- Register the first user');
    console.log('- Create data through your API');
    
    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('Error connecting to database:', error);
    await disconnectDB();
    process.exit(1);
  }
};

initDatabase();