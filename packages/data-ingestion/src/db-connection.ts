import knex, { Knex } from 'knex';
import * as path from 'path';

export function getDbConnection(): Knex {
  return knex({
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'toxicity_analyzer_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    },
    pool: {
      min: 2,
      max: 10,
    },
  });
}

export function getDataPath(filename: string): string {
  // Go up from packages/data-ingestion to root, then into data/
  return path.join(__dirname, '../../../data', filename);
}
