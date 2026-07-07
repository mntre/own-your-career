/**
 * Own Your Career — Converge Cloud Backend (Express Server)
 * 
 * @fileoverview Main server entry point for Converge Cloud deployment
 */

'use strict';

const express = require('express');
const cors = require('cors');
const routes = require('./routes');

/**
 * Creates and configures the Express server
 * @returns {express.Application} Configured Express app
 */
function createServer() {
  const app = express();

  // Middleware
  app.use(cors({
    origin: process.env.CORS_ORIGIN || ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000'],
    credentials: true
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'own-your-career-api'
    });
  });

  // API routes
  app.use(routes);

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  });

  return app;
}

/**
 * Starts the server
 */
function startServer() {
  const PORT = process.env.PORT || 3001;
  const app = createServer();

  app.listen(PORT, () => {
    console.log(`[OYC] Server running on port ${PORT}`);
    console.log(`[OYC] Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Export for testing
module.exports = {
  createServer,
  startServer
};

// Start server if run directly
if (require.main === module) {
  startServer();
}
