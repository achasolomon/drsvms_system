import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { appConfig } from './config/app';
import { morganMiddleware, consoleMorgan } from './utils/logger';
import { globalErrorHandler, notFound } from './middleware/errorHandler';

// Import routes (we'll create these next)
// import routes from './routes';

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] // Replace with actual domain
    : ['http://localhost:3000', 'http://localhost:3001'], // React apps
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: appConfig.rateLimitWindowMs,
  max: appConfig.rateLimitMax,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (appConfig.nodeEnv === 'development') {
  app.use(consoleMorgan);
} else {
  app.use(morganMiddleware);
}

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'DRSVMS API is running',
    timestamp: new Date().toISOString(),
    environment: appConfig.nodeEnv,
  });
});

// API routes
app.use(`/api/${appConfig.apiVersion}`, (req, res, next) => {
  // We'll add routes here in the next phase
  res.json({ message: 'API routes will be added here' });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(globalErrorHandler);

export default app;