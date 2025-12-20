import type { Knex } from 'knex';
import * as dotenv from 'dotenv';

dotenv.config();

const config: { [key: string]: Knex.Config } = {
  development: {
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
    migrations: {
      tableName: 'knex_migrations',
      directory: './src/db/migrations',
    },
    seeds: {
      directory: './src/db/seeds',
    },
  },

  production: {
    client: 'postgresql',
    connection: {
      // Cloud SQL Unix socket connection
      host: process.env.DB_HOST || '/cloudsql/toxicity-analyzer:us-central1:toxicity-analyzer-db',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'toxicity_analyzer',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
    pool: {
      min: 2,
      max: 20,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './dist/db/migrations',
    },
    seeds: {
      directory: './dist/db/seeds',
    },
  },
};

export default config;
