import app from './app';
import { appConfig } from './config/app';
import { syncDatabase } from './models';
import { runSeeders } from './utils/seeders';
import { logger } from './utils/logger';

// Test database connection and sync
const connectDB = async () => {
  try {
    // Sync database models
    await syncDatabase({ force: false, alter: false });
    logger.info('Database synchronized successfully');

    // Run seeders in development
    if (appConfig.nodeEnv === 'development') {
      await runSeeders();
    }
  } catch (error) {
    logger.error('Database setup failed:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await connectDB();

  const server = app.listen(appConfig.port, () => {
    logger.info(`🚀 DRSVMS API Server started`);
    logger.info(`📡 Port: ${appConfig.port}`);
    logger.info(`🌍 Environment: ${appConfig.nodeEnv}`);
    logger.info(`💚 Health check: http://localhost:${appConfig.port}/health`);
    logger.info(`📊 API Base: http://localhost:${appConfig.port}/api/${appConfig.apiVersion}`);

    if (appConfig.nodeEnv === 'development') {
      logger.info(`👨‍💻 Default admin: admin@drsvms.gov.ng / admin123`);
    }
  });

  // Graceful shutdown
  const gracefulShutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});