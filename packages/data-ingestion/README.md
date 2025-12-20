# Data Ingestion CLI

CLI tool for importing data into the Toxicity Analyzer database.

## Features

- Import PRO-CTCAE library (124+ symptom assessment items)
- Import regimen definitions (5 breast cancer treatment protocols)
- Import demo patient dataset (15 patients with treatment schedules)
- Automatic duplicate detection (skips if data already exists)
- Respects foreign key dependencies (correct import order)

## Prerequisites

1. PostgreSQL database running (local or Cloud SQL)
2. Database schema created via migrations
3. Node.js 18+ installed
4. Environment variables configured

## Setup

### 1. Install Dependencies

From the monorepo root:

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the `packages/data-ingestion` directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=toxicity_analyzer_dev
DB_USER=postgres
DB_PASSWORD=your_password_here
```

### 3. Run Database Migrations

From the `packages/api` directory:

```bash
cd packages/api
npm run migrate:latest
```

This creates all required tables (patients, regimens, proctcae_items, etc.).

## Quick Start

For first-time setup, see the [main SETUP guide](/SETUP.md) in the repository root.

## Usage

### Import All Data

Import everything in the correct order (PRO-CTCAE → Regimens → Patients):

```bash
npm run dev all
```

Or after building:

```bash
toxicity-import all
```

### Verify Import

After importing, verify all data was loaded correctly:

```bash
npm run verify
```

### Import Individual Data Types

Import PRO-CTCAE library only:

```bash
npm run dev proctcae
```

Import regimens only:

```bash
npm run dev regimens
```

Import demo patients only:

```bash
npm run dev patients
```

## Data Sources

The CLI reads from JSON files in the `/data` directory:

- **`data/proctcae-library.json`** - PRO-CTCAE item library (18 symptom terms, 50+ items)
- **`data/regimen-toxicity-map.json`** - 5 breast cancer regimens with toxicity profiles
- **`data/demo-patients.json`** - 15 demo patients (P001-P015) with treatment data

## Import Process

### 1. PRO-CTCAE Library Import

- Reads `proctcae-library.json`
- Flattens nested symptom terms into individual items
- Creates records in `proctcae_items` table
- Each item includes: item_code, symptom_category, attribute (frequency/severity/interference), question_text, response_options

Example output:
```
Loading 18 symptom terms...
Found 50 total PRO-CTCAE items
✅ Imported 50 PRO-CTCAE items
```

### 2. Regimen Import

- Reads `regimen-toxicity-map.json`
- Creates 5 regimen records: AC-T, TC, T-DM1, Capecitabine, Pembrolizumab
- Includes toxicity profiles, cycle lengths, nadir windows

Example output:
```
Loading 5 regimens...
✓ AC-T: Doxorubicin + Cyclophosphamide → Taxane
✓ TC: Docetaxel + Cyclophosphamide
✓ T-DM1: Trastuzumab Emtansine
✓ CAPE: Capecitabine
✓ PEMBRO: Pembrolizumab
✅ Imported 5 regimens
```

### 3. Patient Import

- Reads `demo-patients.json`
- Creates patient profiles with demographics and ECOG scores
- Links patients to their current regimen
- Creates treatment records with cycle information
- Creates current cycle records with infusion dates

Example output:
```
Loading 15 demo patients...
✓ P001: AC-T - Cycle 3
✓ P002: TC - Cycle 2
✓ P003: T-DM1 - Cycle 5
...
✅ Imported 15 patients with treatment data
```

## Duplicate Handling

The CLI automatically checks for existing data before importing:

```
⚠️  50 items already exist. Skipping import.
```

This prevents duplicate records and allows safe re-runs.

## Database Schema Dependencies

Import order matters due to foreign key constraints:

1. **PRO-CTCAE items** (no dependencies)
2. **Regimens** (no dependencies)
3. **Patients** (depends on regimens via patient_treatments)

The `all` command automatically handles this ordering.

## Troubleshooting

### Connection Errors

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:** Ensure PostgreSQL is running and credentials are correct in `.env`

### Migration Errors

```
Error: relation "patients" does not exist
```

**Solution:** Run migrations first:
```bash
cd packages/api
npm run migrate:latest
```

### File Not Found

```
Error: Patient data file not found at: /path/to/data/demo-patients.json
```

**Solution:** Ensure you're running the command from the monorepo root, or check that data files exist in the `/data` directory.

### Foreign Key Violations

```
Error: insert or update on table "patient_treatments" violates foreign key constraint
```

**Solution:** Import regimens before patients:
```bash
npm run dev regimens
npm run dev patients
```

## Development

### Build the CLI

```bash
npm run build
```

This compiles TypeScript to `dist/` directory.

### Run in Development Mode

```bash
npm run dev all
```

Uses `tsx` for direct TypeScript execution without build step.

### Clean Build Artifacts

```bash
npm run clean
```

## Architecture

### File Structure

```
packages/data-ingestion/
├── src/
│   ├── index.ts                       # CLI entry point
│   ├── db-connection.ts               # Database utility
│   └── importers/
│       ├── proctcae-importer.ts      # PRO-CTCAE import logic
│       ├── regimen-importer.ts       # Regimen import logic
│       └── patient-importer.ts       # Patient import logic
├── package.json
├── tsconfig.json
└── README.md
```

### Key Components

**`index.ts`** - Commander.js CLI with 4 commands:
- `all` - Import everything
- `proctcae` - PRO-CTCAE only
- `regimens` - Regimens only
- `patients` - Patients only

**`db-connection.ts`** - Knex connection factory and data path helper

**Importers** - Individual importer modules with:
- Duplicate detection
- JSON parsing
- Database insertion
- Progress logging

## Data Validation

Each importer validates:
- Required fields present
- Data types match schema
- Foreign key relationships exist
- Response options are well-formed

## Next Steps

After importing data:

1. Verify data in database:
   ```sql
   SELECT COUNT(*) FROM proctcae_items;  -- Should be ~50
   SELECT COUNT(*) FROM regimens;        -- Should be 5
   SELECT COUNT(*) FROM patients;        -- Should be 15
   ```

2. Test patient authentication:
   ```sql
   SELECT patient_id, firebase_uid FROM patients;
   ```

3. Verify treatment schedules:
   ```sql
   SELECT p.firebase_uid, r.regimen_code, pt.current_cycle
   FROM patients p
   JOIN patient_treatments pt ON p.patient_id = pt.patient_id
   JOIN regimens r ON pt.regimen_id = r.regimen_id;
   ```

---

## Demo Patient Management (NEW)

### Refresh Demo Patients for Current Date

**Problem**: Patient data includes dates (like `last_infusion_date`) that become stale over time, breaking demo scenarios.

**Solution**: The refresh script updates all patient dates relative to the current date while preserving their intended treatment day and demo purpose.

### Quick Start

Before every demo:
```bash
cd packages/data-ingestion
npm run refresh-demo      # Updates all patient dates
npm run test-complete     # Verifies patients in correct phases
```

### Available Demo Scripts

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm run refresh-demo` | Update all patient dates to current date | **Before every demo** |
| `npm run test-complete` | Comprehensive system verification | After refresh, before demo |
| `npm run test-questionnaire` | Test phase detection for key patients | Verify questionnaire logic |
| `npm run check-patients` | Quick patient list check | Verify all patients exist |
| `npm run import-missing` | Import new patients from JSON | When adding new demo patients |

---

### `npm run refresh-demo` - Refresh Patient Dates

**What it does**:
- Calculates new `last_infusion_date` for each patient based on current date
- Maintains each patient's intended treatment day (e.g., P001 always on Day 6)
- Updates `planned_next_infusion` dates accordingly
- Preserves all patient characteristics (symptoms, grades, comorbidities)

**Example**:
```bash
# Original setup (Dec 20, 2025):
# P001 last_infusion: Dec 15, today: Dec 20 → Day 6 ✅

# 2 months later without refresh:
# P001 last_infusion: Dec 15, today: Feb 20 → Day 67 ❌ (Demo breaks!)

# After running refresh-demo on Feb 20:
npm run refresh-demo
# P001 last_infusion: Feb 15, today: Feb 20 → Day 6 ✅ (Demo fixed!)
```

**Patient Configuration** (all 17 patients):
| Patient | Intended Day | Phase | Demo Purpose |
|---------|-------------|-------|--------------|
| P001 | 6 | Recovery | Post-session minimal symptoms |
| P002 | 13 | Nadir | Emerging neuropathy |
| P003 | 26 | Inter | Grade 2 dose-limiting toxicity |
| **P016** | 45 | **Pre-session** | Pre-infusion clearance |
| P004 | 4 | Recovery | Grade 2 myalgia (docetaxel) |
| P005 | 15 | Inter | Cardiac comorbidity monitoring |
| P006 | 6 | Recovery | No symptoms (shortest questionnaire) |
| **P017** | 45 | **Pre-session** | Pre-session with history |
| P007 | 4 | Recovery | Late cycle tolerance (T-DM1) |
| **P008** | 10 | **Nadir** | Thrombocytopenia risk (critical) |
| P009 | 19 | Inter | Long-term treatment success |
| P010 | 5 | Recovery | Oral chemo GI toxicity |
| P011 | 8 | Nadir | Emerging Hand-Foot Syndrome |
| **P012** | 19 | Inter | Grade 2 HFS (dose-limiting) |
| P013 | 4 | Recovery | Early irAE (immunotherapy) |
| **P014** | 15 | Inter | COPD pneumonitis risk (critical) |
| **P015** | 20 | Inter | **Grade 3-4 fatigue (PRIMARY DEMO)** |

**Output example**:
```
🔄 Refreshing Demo Patient Data for Current Date
======================================================================

📅 Current Demo Date: 2025-12-20

📋 Processing P001...
   Intended Treatment Day: 6
   Demo Purpose: Post-session/Recovery phase, minimal symptoms
   Old Last Infusion: 2025-12-15
   New Last Infusion: 2025-12-15
   New Next Infusion: 2026-01-05
   ✅ Updated Cycle 1 dates
   ✅ P001 refreshed successfully

[... continues for all 17 patients ...]

✅ Demo Patient Refresh Complete!
   Updated 17 patients
   Demo Date: 2025-12-20
```

---

### Understanding the Refresh Logic

**Formula**:
```typescript
last_infusion_date = current_date - (intended_treatment_day - 1)

// Example for P001 (intended day: 6):
// Demo on Dec 20: last_infusion = Dec 20 - 5 = Dec 15 → Day 6
// Demo on Feb 20: last_infusion = Feb 20 - 5 = Feb 15 → Day 6
// Patient always demonstrates Day 6 recovery phase!
```

**What gets updated**:
- ✅ `patient_treatments.start_date` (last infusion)
- ✅ `treatment_cycles.infusion_date` (last infusion)
- ✅ `treatment_cycles.planned_next_infusion` (next infusion)

**What stays the same**:
- ❌ Patient demographics (age, BMI, comorbidities)
- ❌ Symptom history (nausea Grade 1, neuropathy Grade 2, etc.)
- ❌ Treatment details (regimen, cycle number, ECOG status)
- ❌ Medical record numbers (P001, P002, etc.)

**Result**: Patient characteristics remain constant across all demo dates.

---

### `npm run test-complete` - System Verification

Comprehensive test suite that verifies:

1. **Patient Count** (expects 17 patients including P016, P017)
2. **Pre-session Patients** (P016, P017 exist and configured correctly)
3. **Regimen Distribution** (AC-T, TC, T-DM1, Capecitabine, Pembrolizumab)
4. **Treatment Cycles** (all patients have valid cycles with dates)
5. **Toxicity Profiles** (regimens have phase-specific priorities)
6. **Phase Distribution** (all 5 phases represented: pre_session, post_session, recovery, nadir, inter_cycle)

**Run after**:
- `npm run refresh-demo` to verify dates updated correctly
- Database schema changes to ensure data integrity
- Adding new patients to verify import success

**Example output**:
```
🧪 COMPREHENSIVE DEMO DATA TEST

📊 Test 1: Patient Count
   Found 17 patients
   ✅ PASS: All 17 patients present

📋 Test 2: Pre-Session Patients
   ✅ P016 exists: P016
   ✅ P017 exists: P017
   ✅ PASS: Both pre_session patients imported

📅 Test 6: Patient Phase Distribution
   pre_session: 2 patients
   post_session: 2 patients
   recovery: 4 patients
   nadir: 4 patients
   inter_cycle: 5 patients
   ✅ PASS: Pre-session phase now represented

✅ Demo data is ready for demonstration!
```

---

### Typical Demo Workflow

**Day of demo**:
```bash
cd packages/data-ingestion

# 1. Refresh patient dates (REQUIRED before every demo)
npm run refresh-demo

# 2. Verify all patients in correct phases
npm run test-complete

# 3. Optional: Check specific patients
npm run check-patients
```

**Expected result**:
- All 17 patients updated to current date
- P001 on Day 6 (recovery)
- P016 & P017 on Day 45 (pre-session, 6 days before next infusion)
- P008 on Day 10 (nadir - thrombocytopenia monitoring)
- P015 on Day 20 (inter-cycle - Grade 3-4 fatigue demonstration)

---

### Modifying Patient Configuration

Patient configuration is in `src/refresh-demo-patients.ts`:

```typescript
const PATIENT_DEMO_CONFIG = [
  {
    medical_record_number: 'P001',
    intended_treatment_day: 6,      // Day of cycle to maintain
    cycle_length_days: 21,          // Standard cycle length
    has_planned_next_infusion: true, // Has next infusion scheduled
    demo_purpose: 'Post-session/Recovery phase, minimal symptoms'
  },
  // ... 16 more patients
];
```

**To change a patient's day/phase**:
1. Edit `intended_treatment_day` in `refresh-demo-patients.ts`
2. Update `demo_purpose` description
3. Run `npm run refresh-demo`
4. Run `npm run test-complete` to verify

**Example**: Change P001 from Day 6 (recovery) to Day 2 (post-session):
```typescript
{
  medical_record_number: 'P001',
  intended_treatment_day: 2,  // Changed from 6 to 2
  cycle_length_days: 21,
  has_planned_next_infusion: true,
  demo_purpose: 'Post-session acute toxicity'  // Updated
}
```

---

### Troubleshooting

**"Phase mismatch after refresh"**
- Check phase boundaries (post_session: 1-3, recovery: 4-6, nadir: 7-12)
- Verify `intended_treatment_day` matches expected phase
- Run `npm run test-questionnaire` to see actual phase calculation

**"Patient not found in database"**
- Run `npm run check-patients` to see which patients exist
- Run `npm run import-missing` to import missing patients from `demo-patients.json`

**"Patients in wrong phase during demo"**
- **Most common issue**: Forgot to run `npm run refresh-demo`
- Solution: Always run refresh on demo day (dates are relative)

---

### Best Practices

✅ **DO**:
- Run `npm run refresh-demo` on demo day (or immediately before)
- Run `npm run test-complete` after refresh to verify
- Version control patient configuration (it's code, not data)
- Update demo documentation when changing patient purposes

❌ **DON'T**:
- Skip refresh before demos (dates will be stale)
- Manually edit dates in database (use refresh script)
- Modify patient data in database directly (use `demo-patients.json`)
- Change `intended_treatment_day` without testing verification

---

### Related Demo Documentation

Full demo documentation in `/docs/demo/`:
- **README.md** - Quick reference, demo scenarios, patient lookup
- **system-logic-documentation.md** - Technical system explanation (35 pages)
- **patient-portfolio-guide.md** - All 17 patient profiles with clinical context (40 pages)

---

## License

Proprietary - Risa Labs Inc.
