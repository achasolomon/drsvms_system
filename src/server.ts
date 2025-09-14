import app from './app';
import { appConfig } from './config/app';
import sequelize from './config/database';
import { logger } from './utils/logger';

// Test database connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    
    // Sync database in development
    if (appConfig.nodeEnv === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Database synchronized');
    }
  } catch (error) {
    logger.error('Unable to connect to database:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await connectDB();
  
  const server = app.listen(appConfig.port, () => {
    logger.info(`Server running on port ${appConfig.port} in ${appConfig.nodeEnv} mode`);
    logger.info(`Health check: http://localhost:${appConfig.port}/health`);
  });

  // Graceful shutdown
  const gracefulShutdown = () => {
    logger.info('Received shutdown signal, shutting down gracefully');
    server.close(() => {
      logger.info('HTTP server closed');
      sequelize.close().then(() => {
        logger.info('Database connection closed');
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
};

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});