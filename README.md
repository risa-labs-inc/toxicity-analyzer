# Toxicity Analyzer

A patient-facing web application for breast cancer treatment toxicity monitoring using personalized PRO-CTCAE questionnaires with intelligent orchestration.

## Overview

The Toxicity Analyzer delivers personalized symptom assessments to cancer patients based on their specific treatment regimen, cycle phase, and historical responses. The system uses validated PRO-CTCAE (Patient-Reported Outcomes - Common Terminology Criteria for Adverse Events) items and NCI-approved scoring algorithms to grade toxicity and alert clinicians to concerning symptoms.

**Core Flow:** Patient Login → Personalized Questionnaire → Submit Responses → NCI Grading → Clinician Dashboard

## Tech Stack

- **Frontend:** React web applications (patient + clinician dashboards)
- **Backend:** Node.js + Express + TypeScript on GCP Cloud Functions
- **Database:** PostgreSQL (Cloud SQL)
- **Auth:** Simple demo auth (15 hardcoded patient logins)
- **Cloud:** Google Cloud Platform
- **Monorepo:** Turborepo for package management

## MVP Scope

### Included in MVP (6-8 weeks):
- ✅ Intelligent questionnaire generation (Profiler + Orchestrator)
- ✅ Full PRO-CTCAE library (124+ items)
- ✅ All 5 regimens: AC-T, TC, T-DM1, Capecitabine, Pembrolizumab
- ✅ NCI-validated scoring algorithm
- ✅ Patient questionnaire interface
- ✅ Basic clinician triage dashboard
- ✅ Emergency alerts (Grade 3/4)
- ✅ HIPAA compliance (encryption, audit logs)

### Deferred to Post-MVP:
- ⏭ Advanced trend visualization (sparklines)
- ⏭ Daily Guardian questionnaire
- ⏭ Medication adherence tracking
- ⏭ Comprehensive analytics/heatmaps
- ⏭ Predictive alerting

## Project Structure

```
/toxicity-analyzer/
├── packages/
│   ├── shared/              # Shared TypeScript types & utilities
│   ├── intelligence-layer/  # Profiler, Orchestrator, Scoring (serverless)
│   ├── api/                 # Express backend (Cloud Functions)
│   ├── patient-app/         # React patient application
│   ├── clinician-dashboard/ # React clinician application
│   └── data-ingestion/      # CLI tool for data import
├── infrastructure/          # Terraform for GCP
├── data/                    # PRO-CTCAE library, regimen mappings, demo data
└── docs/                    # API docs, architecture diagrams
```

## Getting Started

📖 **For detailed setup instructions, see [SETUP.md](/SETUP.md)**

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL 15
- GCP account (for deployment)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/risa-labs-inc/toxicity-analyzer.git
cd toxicity-analyzer
```

2. Install dependencies:
```bash
npm install
```

3. Build all packages:
```bash
npm run build
```

### Development

Run all packages in development mode:
```bash
npm run dev
```

Run specific package:
```bash
cd packages/api
npm run dev
```

### Testing

Run tests across all packages:
```bash
npm run test
```

## Key Components

### Intelligence Layer (Core Business Logic)

- **The Profiler:** Calculates treatment context (regimen, cycle, day, phase, nadir status)
- **The Orchestrator:** Selects appropriate PRO-CTCAE items based on context
- **Scoring Service:** Implements NCI grading algorithm (composite grade 0-4)
- **Alert Engine:** Triggers emergency alerts for Grade 3/4 events

### Data Model

Core PostgreSQL tables:
- `patients` - Patient profiles with encrypted PHI
- `regimens` - 5 breast cancer treatment protocols
- `patient_treatments` - Active treatment tracking
- `treatment_cycles` - Infusion schedules
- `proctcae_items` - Full 124+ item library
- `questionnaires` - Generated questionnaire instances
- `questionnaire_responses` - Patient responses
- `toxicity_scores` - Calculated grades
- `alerts` - Emergency and triage alerts
- `audit_logs` - HIPAA compliance audit trail

## API Endpoints

### Patient API
```
GET    /api/v1/patient/profile
GET    /api/v1/patient/treatment/timeline
GET    /api/v1/patient/questionnaires/pending
GET    /api/v1/patient/questionnaires/:id
POST   /api/v1/patient/questionnaires/:id/start
POST   /api/v1/patient/questionnaires/:id/responses
POST   /api/v1/patient/questionnaires/:id/submit
GET    /api/v1/patient/alerts/active
```

### Clinician API
```
GET    /api/v1/clinician/triage/queue
GET    /api/v1/clinician/patients/:id/overview
GET    /api/v1/clinician/patients/:id/toxicity-history
POST   /api/v1/clinician/alerts/:id/acknowledge
GET    /api/v1/clinician/responses/:questionnaireId/detailed
```

## Demo Authentication

For demo purposes, the system uses 15 hardcoded patient logins based on the demo dataset (P001-P015). Each patient has a simple ID/password combination for easy testing.

Patient IDs: P001, P002, P003, ... P015
Password: (to be configured)

## HIPAA Compliance

### Encryption
- **At Rest:** All PHI fields encrypted using GCP Cloud KMS
- **In Transit:** TLS 1.3 for all connections
- **Application Layer:** Encrypt before DB insert, decrypt after retrieval

### Audit Logging
- Log all patient data access (who, when, what, why)
- Log all PHI modifications
- Retain audit logs for 7 years
- Automatic logging via middleware

### Access Control
- Role-based access (patient, clinician, admin)
- Simple demo auth for MVP
- Principle of least privilege
- Service accounts with minimal permissions

## Deployment

### Deploying the Backend API

**IMPORTANT:** Always use the ROOT `cloudbuild.yaml` for API deployment.

```bash
# From project root
gcloud builds submit --config=cloudbuild.yaml --substitutions=COMMIT_SHA=$(git rev-parse --short HEAD)
```

**What happens:**
1. Builds Docker image with latest code
2. Pushes to Artifact Registry
3. Deploys to Cloud Run (`toxicity-analyzer-api`)
4. Runs database migrations automatically
5. Updates environment variables and secrets

**Live API:** https://toxicity-analyzer-api-4tebejtipa-uc.a.run.app/api/v1

### Deploying the Frontend

**Patient App:**
```bash
firebase deploy --only hosting:patient-app
```

**Clinician Dashboard:**
```bash
firebase deploy --only hosting:clinician-dashboard
```

**Live URLs:**
- Patient App: https://toxicity-analyzer-patient.web.app
- Clinician Dashboard: https://toxicity-analyzer-clinician.web.app

## Development Workflow

### Branch Strategy

- **`main`** - Production branch (protected, manual deployment only)
- **`develop`** - Integration branch for ongoing development
- **`feature/*`** - Feature branches created from develop

### Working on New Features

```bash
# 1. Start from develop
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Make changes and commit
git add .
git commit -m "feat: description"

# 4. Push and create PR to develop
git push -u origin feature/your-feature-name
```

### Preview Deployments

When you create a pull request to `develop`, GitHub Actions automatically:
- Builds the frontend applications
- Deploys to a Firebase preview channel
- Comments on the PR with preview URLs
- Preview expires after 7 days

Use preview URLs to test changes or share with stakeholders before merging.

### Deploying to Production

Production deployments require manual approval:

1. Merge approved PRs into `develop`
2. Create release PR: `main` ← `develop`
3. After merge, go to GitHub Actions → Deploy to Firebase
4. Click "Run workflow" → Select `main` → Enable "Deploy to production"

## Contributing

1. Create a feature branch from `develop`
2. Make your changes
3. Run tests: `npm run test`
4. Run linting: `npm run lint`
5. Submit a pull request to `develop`

## License

Proprietary - RISA Labs Inc.

## Contact

For questions or issues, please contact the RISA Labs team.
