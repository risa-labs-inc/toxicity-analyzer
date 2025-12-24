import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import * as dotenv from 'dotenv';
import patientRoutes from './routes/patient.routes';
import clinicianRoutes from './routes/clinician.routes';
import { auditLog } from './middleware/audit.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { testConnection } from './db/connection';

// Load environment variables
dotenv.config();

/**
 * Create and configure Express application
 */
export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  const allowedOrigins = [
    'https://toxicity-analyzer-patient.web.app',
    'https://toxicity-analyzer-clinician.web.app',
    'http://localhost:5173',  // Dev patient app
    'http://localhost:5174',  // Dev clinician dashboard
  ];

  if (process.env.CORS_ORIGIN) {
    allowedOrigins.push(process.env.CORS_ORIGIN);
  }

  // Function to check if origin is allowed
  const isOriginAllowed = (origin: string | undefined): boolean => {
    if (!origin) return false;

    // Check exact matches
    if (allowedOrigins.includes(origin)) return true;

    // Allow Firebase preview channels for both apps
    // Pattern: https://toxicity-analyzer-{patient|clinician}--pr*-*.web.app
    const previewPatterns = [
      /^https:\/\/toxicity-analyzer-patient--pr\d+-[a-z0-9]+\.web\.app$/,
      /^https:\/\/toxicity-analyzer-clinician--pr\d+-[a-z0-9]+\.web\.app$/,
    ];

    return previewPatterns.some(pattern => pattern.test(origin));
  };

  app.use(
    cors({
      origin: (origin, callback) => {
        // In development, allow all origins
        if (process.env.NODE_ENV !== 'production') {
          callback(null, true);
          return;
        }

        // In production, check if origin is allowed
        if (isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    })
  );

  // Request parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging middleware
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

  // HIPAA audit logging middleware
  app.use(auditLog);

  // Cloud Run health check endpoint (root path required)
  app.get('/', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Toxicity Analyzer API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // Detailed health check endpoint
  app.get('/health', async (req, res) => {
    const dbHealthy = await testConnection();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // API version info
  app.get('/api/v1', (req, res) => {
    res.json({
      name: 'Toxicity Analyzer API',
      version: '1.0.0',
      description: 'Patient-facing toxicity monitoring with personalized PRO-CTCAE questionnaires',
      endpoints: {
        patient: '/api/v1/patient',
        clinician: '/api/v1/clinician',
      },
    });
  });

  // API Routes
  app.use('/api/v1/patient', patientRoutes);
  app.use('/api/v1/clinician', clinicianRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}
