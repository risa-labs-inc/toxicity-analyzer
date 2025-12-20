#!/usr/bin/env node

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import { importProCTCAE } from './importers/proctcae-importer';
import { importRegimens } from './importers/regimen-importer';
import { importPatients } from './importers/patient-importer';
import { getDbConnection } from './db-connection';

dotenv.config();

const program = new Command();

program
  .name('toxicity-import')
  .description('CLI tool for importing data into Toxicity Analyzer database')
  .version('1.0.0');

program
  .command('all')
  .description('Import all data (PRO-CTCAE, regimens, patients)')
  .action(async () => {
    console.log('🚀 Starting full data import...\n');

    try {
      const db = getDbConnection();

      // Import in correct order due to foreign key dependencies
      console.log('1️⃣  Importing PRO-CTCAE library...');
      await importProCTCAE(db);

      console.log('\n2️⃣  Importing regimens...');
      await importRegimens(db);

      console.log('\n3️⃣  Importing patients...');
      await importPatients(db);

      console.log('\n✅ All data imported successfully!');
      await db.destroy();
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Import failed:', error);
      process.exit(1);
    }
  });

program
  .command('proctcae')
  .description('Import PRO-CTCAE library only')
  .action(async () => {
    try {
      const db = getDbConnection();
      await importProCTCAE(db);
      await db.destroy();
      process.exit(0);
    } catch (error) {
      console.error('❌ Import failed:', error);
      process.exit(1);
    }
  });

program
  .command('regimens')
  .description('Import regimens only')
  .action(async () => {
    try {
      const db = getDbConnection();
      await importRegimens(db);
      await db.destroy();
      process.exit(0);
    } catch (error) {
      console.error('❌ Import failed:', error);
      process.exit(1);
    }
  });

program
  .command('patients')
  .description('Import demo patients only')
  .action(async () => {
    try {
      const db = getDbConnection();
      await importPatients(db);
      await db.destroy();
      process.exit(0);
    } catch (error) {
      console.error('❌ Import failed:', error);
      process.exit(1);
    }
  });

program.parse();
