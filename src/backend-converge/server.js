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
    origin: function(origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // Allow all localhost variants
      const allowedPatterns = [
        /^http:\/\/localhost(:\d+)?$/,
        /^http:\/\/127\.0\.0\.1(:\d+)?$/
      ];
      
      // Allow any origin from CORS_ORIGIN env var (comma-separated)
      const envOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
      
      const isAllowed = allowedPatterns.some(p => p.test(origin)) ||
                        envOrigins.includes(origin) ||
                        envOrigins.includes('*');
      
      // In development or if no CORS_ORIGIN is set, allow same-host requests
      if (isAllowed || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
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
async function startServer() {
  const PORT = process.env.PORT || 5500;
  const app = createServer();

  // Initialize database
  const { initDB } = require('./db');
  await initDB();

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
