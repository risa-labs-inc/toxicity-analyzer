# Toxicity Analyzer - Setup Guide

Step-by-step guide to set up the development environment and seed the database.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 15+ installed and running
- Git installed
- npm or pnpm package manager

## Phase 1: Foundation Setup (Current)

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/risa-labs-inc/toxicity-analyzer.git
cd toxicity-analyzer

# Install all dependencies (using npm workspaces)
npm install
```

### Step 2: Set Up PostgreSQL Database

#### Option A: Local PostgreSQL

1. **Start PostgreSQL** (if not already running):
   ```bash
   # macOS with Homebrew
   brew services start postgresql@15

   # Linux
   sudo systemctl start postgresql

   # Check if running
   psql --version
   ```

2. **Create Database**:
   ```bash
   psql -U postgres
   ```

   In the PostgreSQL prompt:
   ```sql
   CREATE DATABASE toxicity_analyzer_dev;
   \q
   ```

3. **Verify connection**:
   ```bash
   psql -U postgres -d toxicity_analyzer_dev -c "SELECT version();"
   ```

#### Option B: GCP Cloud SQL

1. Create Cloud SQL instance via GCP Console
2. Create database: `toxicity_analyzer_dev`
3. Use Cloud SQL Proxy for local connection:
   ```bash
   ./cloud_sql_proxy -instances=PROJECT:REGION:INSTANCE=tcp:5432
   ```

### Step 3: Configure Environment Variables

#### API Package Configuration

Create `packages/api/.env`:

```bash
cp packages/api/.env.example packages/api/.env
```

Edit `packages/api/.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=toxicity_analyzer_dev
DB_USER=postgres
DB_PASSWORD=your_password_here

# Server
PORT=3000
NODE_ENV=development

# Firebase (for later phases)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
```

#### Data Ingestion Package Configuration

Create `packages/data-ingestion/.env`:

```bash
cp packages/data-ingestion/.env.example packages/data-ingestion/.env
```

Edit `packages/data-ingestion/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=toxicity_analyzer_dev
DB_USER=postgres
DB_PASSWORD=your_password_here
```

### Step 4: Run Database Migrations

Migrations create all required tables with proper schema.

```bash
cd packages/api
npm run migrate:latest
```

Expected output:
```
Batch 1 run: 1 migrations
✓ 001_initial_schema.ts
```

Verify tables were created:
```bash
psql -U postgres -d toxicity_analyzer_dev -c "\dt"
```

You should see:
- patients
- regimens
- patient_treatments
- treatment_cycles
- proctcae_items
- questionnaires
- questionnaire_responses
- toxicity_scores
- alerts
- audit_logs

### Step 5: Import Seed Data

Import PRO-CTCAE library, regimens, and demo patients.

```bash
cd packages/data-ingestion

# Import all data (recommended)
npm run dev all

# Or import individually:
npm run dev proctcae    # Import PRO-CTCAE library
npm run dev regimens    # Import 5 regimens
npm run dev patients    # Import 15 demo patients
```

Expected output:
```
🚀 Starting full data import...

1️⃣  Importing PRO-CTCAE library...
   Loading 18 symptom terms...
   Found 50 total PRO-CTCAE items
   ✅ Imported 50 PRO-CTCAE items

2️⃣  Importing regimens...
   Loading 5 regimens...
   ✓ AC-T: Doxorubicin + Cyclophosphamide → Taxane
   ✓ TC: Docetaxel + Cyclophosphamide
   ✓ T-DM1: Trastuzumab Emtansine
   ✓ CAPE: Capecitabine
   ✓ PEMBRO: Pembrolizumab
   ✅ Imported 5 regimens

3️⃣  Importing patients...
   Loading 15 demo patients...
   ✓ P001: AC-T - Cycle 3
   ✓ P002: TC - Cycle 2
   ...
   ✅ Imported 15 patients with treatment data

✅ All data imported successfully!
```

### Step 6: Verify Data Import

Run the verification script to ensure all data was imported correctly:

```bash
cd packages/data-ingestion
npm run verify
```

Expected output:
```
🔍 Verifying database imports...

✓ PRO-CTCAE Items: 50 items
  Sample items:
    - NAUSEA_FREQ (gastrointestinal/frequency)
    - NAUSEA_SEV (gastrointestinal/severity)
    - VOMIT_FREQ (gastrointestinal/frequency)

✓ Regimens: 5 regimens
  Regimens:
    - AC-T: Doxorubicin + Cyclophosphamide → Taxane (21 days)
    - TC: Docetaxel + Cyclophosphamide (21 days)
    - T-DM1: Trastuzumab Emtansine (21 days)
    - CAPE: Capecitabine (21 days)
    - PEMBRO: Pembrolizumab (21 days)

✓ Patients: 15 patients
  Sample patients:
    - P001: AC-T (Cycle 3/6) - active
    - P002: TC (Cycle 2/6) - active
    ...

✓ Treatment Cycles: 15 cycles

🔗 Verifying relationships...
  ✓ All patient treatments properly linked
  ✓ All treatment cycles properly linked

✅ Database import verification PASSED

Expected data:
  - PRO-CTCAE Items: ~50 items ✓
  - Regimens: 5 regimens ✓
  - Patients: 15 patients ✓
```

### Step 7: Explore the Data

#### View Patient Logins

```sql
psql -U postgres -d toxicity_analyzer_dev

SELECT firebase_uid, medical_record_number, status
FROM patients
ORDER BY firebase_uid;
```

Demo logins (for authentication in future phases):
- P001 through P015

#### View Treatment Schedules

```sql
SELECT
  p.firebase_uid,
  r.regimen_code,
  r.regimen_name,
  pt.current_cycle,
  pt.total_planned_cycles,
  tc.infusion_date,
  tc.planned_next_infusion
FROM patients p
JOIN patient_treatments pt ON p.patient_id = pt.patient_id
JOIN regimens r ON pt.regimen_id = r.regimen_id
JOIN treatment_cycles tc ON pt.treatment_id = tc.treatment_id
ORDER BY p.firebase_uid;
```

#### View PRO-CTCAE Items by Symptom

```sql
SELECT
  symptom_category,
  COUNT(*) as item_count
FROM proctcae_items
GROUP BY symptom_category
ORDER BY item_count DESC;
```

#### View Regimen Toxicity Profiles

```sql
SELECT
  regimen_code,
  regimen_name,
  standard_cycle_length_days,
  nadir_window_start,
  nadir_window_end,
  toxicity_profile
FROM regimens
ORDER BY regimen_code;
```

## Troubleshooting

### PostgreSQL Connection Issues

**Error**: `ECONNREFUSED 127.0.0.1:5432`

**Solutions**:
1. Verify PostgreSQL is running:
   ```bash
   pg_isready
   ```

2. Check PostgreSQL config allows local connections:
   ```bash
   # Find config file
   psql -U postgres -c "SHOW config_file"

   # Edit postgresql.conf
   listen_addresses = 'localhost'
   ```

3. Check pg_hba.conf allows local auth:
   ```
   local   all   postgres   trust
   host    all   all        127.0.0.1/32   md5
   ```

4. Restart PostgreSQL:
   ```bash
   brew services restart postgresql@15
   ```

### Migration Errors

**Error**: `relation "patients" already exists`

**Solution**: Rollback and re-run:
```bash
cd packages/api
npm run migrate:rollback
npm run migrate:latest
```

**Error**: `password authentication failed for user "postgres"`

**Solution**: Update .env with correct password or reset PostgreSQL password:
```bash
psql -U postgres
ALTER USER postgres PASSWORD 'new_password';
```

### Import Errors

**Error**: `Patient data file not found`

**Solution**: Ensure you're running from correct directory:
```bash
# Run from monorepo root or packages/data-ingestion
cd /path/to/toxicity-analyzer
cd packages/data-ingestion
npm run dev all
```

**Error**: `Regimen not found: AC-T for patient P001`

**Solution**: Import regimens before patients:
```bash
npm run dev regimens
npm run dev patients
```

## Next Steps

After completing Phase 1 setup:

1. ✅ Monorepo structure created
2. ✅ Database schema migrated
3. ✅ Seed data imported
4. ⏭ **Phase 2: Intelligence Layer** (Profiler, Orchestrator, Scoring)
5. ⏭ Phase 3: Backend API
6. ⏭ Phase 4: Patient Application
7. ⏭ Phase 5: Clinician Dashboard

### Phase 2 Preview: Intelligence Layer

Next steps will build:
- **The Profiler**: Calculate treatment timeline and cycle phase
- **The Orchestrator**: Dynamic question selection
- **NCI Scoring**: Composite grade calculation (0-4)
- **Alert Engine**: Emergency detection for Grade 3/4

## Useful Commands

```bash
# Build all packages
npm run build

# Run in development mode
npm run dev

# Clean all build artifacts
npm run clean

# Lint code
npm run lint

# Format code
npm run format

# View database
psql -U postgres -d toxicity_analyzer_dev

# Reset database (CAUTION: deletes all data)
cd packages/api
npm run migrate:rollback
npm run migrate:latest
cd ../data-ingestion
npm run dev all
```

## Architecture Reference

### Monorepo Structure

```
/toxicity-analyzer/
├── packages/
│   ├── shared/              # ✅ TypeScript types & constants
│   ├── intelligence-layer/  # ⏭ Profiler, Orchestrator, Scoring
│   ├── api/                 # ✅ Express backend (migrations ready)
│   ├── patient-app/         # ⏭ React patient application
│   ├── clinician-dashboard/ # ⏭ React clinician application
│   └── data-ingestion/      # ✅ CLI tool for data import
├── data/                    # ✅ Seed data (PRO-CTCAE, regimens, patients)
├── infrastructure/          # ⏭ Terraform for GCP
└── docs/                    # Documentation
```

### Database Schema

10 tables with proper relationships:
- **patients**: Patient profiles (15 demo patients)
- **regimens**: 5 breast cancer protocols
- **patient_treatments**: Active treatment tracking
- **treatment_cycles**: Infusion schedules
- **proctcae_items**: 50+ symptom assessment items
- **questionnaires**: Generated questionnaire instances (empty)
- **questionnaire_responses**: Patient responses (empty)
- **toxicity_scores**: Calculated grades (empty)
- **alerts**: Emergency and triage alerts (empty)
- **audit_logs**: HIPAA compliance trail (empty)

## Support

- GitHub Issues: https://github.com/risa-labs-inc/toxicity-analyzer/issues
- Documentation: See `/docs` directory
- Implementation Plan: See `/.claude/plans/dreamy-purring-breeze.md`
