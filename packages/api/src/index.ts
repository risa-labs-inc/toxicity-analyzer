import { createApp } from './app';
import { closeDb } from './db/connection';

const PORT = process.env.PORT || 8080;

const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`🚀 Toxicity Analyzer API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   API docs: http://localhost:${PORT}/api/v1`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    await closeDb();
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(async () => {
    await closeDb();
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
