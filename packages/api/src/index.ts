import { createApp } from './app';
import { closeDb } from './db/connection';
import { runMigrations } from './db/migrate';

const PORT = process.env.PORT || 8080;

/**
 * Start the API server
 * Runs database migrations before starting
 */
async function startServer() {
  try {
    // Run migrations first (safe to run multiple times)
    if (process.env.NODE_ENV === 'production') {
      await runMigrations();
    } else {
      console.log('⚠️  Skipping migrations in development mode');
      console.log('   Run migrations manually: npm run migrate:latest');
    }

    // Start the Express server
    const app = createApp();
    const server = app.listen(PORT, () => {
      console.log(`🚀 Toxicity Analyzer API running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
      console.log(`   API docs: http://localhost:${PORT}/api/v1`);
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
const serverPromise = startServer();
let server: any;

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  const srv = await serverPromise;
  srv.close(async () => {
    await closeDb();
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  const srv = await serverPromise;
  srv.close(async () => {
    await closeDb();
    console.log('Server closed');
    process.exit(0);
  });
});

// Export for testing
serverPromise.then((srv) => {
  server = srv;
});

export default serverPromise;
