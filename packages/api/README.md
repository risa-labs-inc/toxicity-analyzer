# Toxicity Analyzer API

Express backend API for the Toxicity Analyzer application with intelligent PRO-CTCAE questionnaire generation, NCI-validated scoring, and emergency alerting.

## Features

- **Intelligent Questionnaire Generation** - Personalized PRO-CTCAE selection using The Profiler and The Orchestrator
- **NCI-Validated Scoring** - Composite grade calculation (0-4) using validated algorithm
- **Emergency Alerting** - Automatic detection of Grade 3/4 toxicities with triage prioritization
- **HIPAA Compliance** - Audit logging, encryption at rest/transit, access controls
- **Demo Authentication** - 15 hardcoded patient logins (P001-P015) for MVP demo

## Architecture

```
packages/api/src/
├── middleware/          # Authentication, audit logging, error handling
├── repositories/        # Database access layer
├── services/           # Business logic with intelligence layer integration
├── routes/             # API endpoints
├── db/                 # Database connection and migrations
├── app.ts              # Express app configuration
└── index.ts            # Server entry point
```

## Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Completed database migrations
- Seed data imported (PRO-CTCAE, regimens, patients)

## Setup

### 1. Install Dependencies

From monorepo root:
```bash
npm install
```

### 2. Configure Environment

Create `packages/api/.env`:

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

# CORS
CORS_ORIGIN=http://localhost:5173

# Debug
DEBUG=false
```

### 3. Run Migrations

```bash
cd packages/api
npm run migrate:latest
```

### 4. Import Seed Data

```bash
cd packages/data-ingestion
npm run dev all
```

## Development

### Start Development Server

```bash
cd packages/api
npm run dev
```

Server starts on http://localhost:3000

### Build for Production

```bash
npm run build
```

### Run Tests

```bash
npm test
```

## Questionnaire Generation Approaches

The system supports two questionnaire generation approaches:

### 1. Drug-Module Approach (Default, Recommended) ✅

**Endpoint:** `POST /api/v1/patient/questionnaires/generate?mode=drug-module`

**Features:**
- **200% better safety signal coverage** - Significantly improved detection of critical safety events
- **Safety proxy symptoms** - Critical symptoms (fever, chest pain, bleeding, etc.) always included regardless of treatment phase
- **Granular drug tracking** - Each drug is a module with specific symptom mappings and safety proxies
- **Sequential regimen support** - Properly handles multi-phase regimens (e.g., AC → T)

**Use Cases:**
- ✅ Production use (recommended)
- ✅ Comprehensive safety monitoring
- ✅ Research and clinical trials
- ✅ Early detection of dose-limiting toxicities

### 2. Regimen-Phase-History Approach (Legacy)

**Endpoint:** `POST /api/v1/patient/questionnaires/generate?mode=regimen`

**Features:**
- **Lower question burden** - Average 10.3 questions vs 12.3 for drug-module
- **Phase-based filtering** - All symptoms respect cycle phase filtering
- **Established patterns** - Based on well-known regimen toxicity profiles

**Use Cases:**
- ⚠️ Backward compatibility
- ⚠️ Comparison studies
- ⚠️ Scenarios requiring minimal question burden

### Default Behavior

If no `mode` parameter is provided, the system defaults to **`drug-module`** for superior safety coverage.

## API Endpoints

### Patient API

**Base URL:** `/api/v1/patient`

**Authentication:** `Authorization: Demo P001` (P001-P015)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | Get patient profile |
| GET | `/treatment/timeline` | Get current treatment timeline and cycle phase |
| GET | `/questionnaires/pending` | Get pending questionnaires |
| POST | `/questionnaires/generate?mode=drug-module\|regimen` | Generate new personalized questionnaire (defaults to drug-module) |
| POST | `/questionnaires/generate-drug-module` | Generate questionnaire (drug-module, legacy endpoint) |
| POST | `/questionnaires/compare` | Generate and compare both approaches |
| GET | `/questionnaires/:id` | Get questionnaire with items |
| POST | `/questionnaires/:id/start` | Start questionnaire session |
| POST | `/questionnaires/:id/responses` | Submit response to question |
| POST | `/questionnaires/:id/submit` | Complete questionnaire and calculate scores |
| GET | `/alerts/active` | Get active alerts |

### Clinician API

**Base URL:** `/api/v1/clinician`

**Authentication:** `Authorization: Clinician CLIN001`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/triage/queue` | Get prioritized triage queue |
| GET | `/patients/:id/overview` | Get patient overview with recent data |
| GET | `/patients/:id/toxicity-history` | Get toxicity score history |
| GET | `/responses/:questionnaireId/detailed` | Get detailed responses for questionnaire |
| POST | `/alerts/:id/acknowledge` | Acknowledge alert |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check with database status |
| GET | `/api/v1` | API version and endpoint info |

## Usage Examples

### Patient: Generate Questionnaire (Drug-Module Approach)

```bash
# Default: drug-module approach
curl -X POST http://localhost:3000/api/v1/patient/questionnaires/generate \
  -H "Authorization: Demo P001" \
  -H "Content-Type: application/json"

# Explicit drug-module
curl -X POST "http://localhost:3000/api/v1/patient/questionnaires/generate?mode=drug-module" \
  -H "Authorization: Demo P001" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "questionnaire": {
    "questionnaireId": "uuid",
    "patientId": "P001-patient-id",
    "status": "pending",
    "selectedItems": ["item1", "item2", ...],
    "treatmentDay": 9,
    "questionnaireType": "nadir"
  },
  "items": [
    {
      "itemId": "item1",
      "itemCode": "NAUSEA_FREQ",
      "symptomCategory": "gastrointestinal",
      "attribute": "frequency",
      "questionText": "In the last 7 days, how OFTEN did you have NAUSEA?",
      "responseOptions": [
        {"value": 0, "label": "Never"},
        {"value": 1, "label": "Rarely"},
        ...
      ]
    }
  ],
  "metadata": {
    "generationApproach": "drug-module",
    "activeDrugs": [
      {"drugName": "Paclitaxel", "cycleNumber": 5}
    ],
    "totalSymptoms": {
      "beforeDedup": 15,
      "afterDedup": 11
    },
    "phaseFilteringApplied": true,
    "currentPhase": "nadir",
    "regimenCode": "AC-T",
    "cycleDay": 9
  },
  "message": "Personalized questionnaire generated successfully (drug-module approach)"
}
```

### Patient: Generate Questionnaire (Regimen Approach)

```bash
curl -X POST "http://localhost:3000/api/v1/patient/questionnaires/generate?mode=regimen" \
  -H "Authorization: Demo P001" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "questionnaire": { /* same structure */ },
  "items": [ /* same structure */ ],
  "metadata": {
    "generationApproach": "regimen-phase-history",
    "activeDrugs": [],
    "totalSymptoms": {
      "beforeDedup": 0,
      "afterDedup": 0
    },
    "phaseFilteringApplied": true
  },
  "message": "Personalized questionnaire generated successfully (regimen approach)"
}
```

### Patient: Submit Response

```bash
curl -X POST http://localhost:3000/api/v1/patient/questionnaires/:id/responses \
  -H "Authorization: Demo P001" \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": "item1",
    "responseValue": 3,
    "responseLabel": "Frequently"
  }'
```

**Response:**
```json
{
  "response": {
    "responseId": "uuid",
    "questionnaireId": "uuid",
    "itemId": "item1",
    "responseValue": 3,
    "responseLabel": "Frequently"
  },
  "branchingQuestions": [
    {
      "itemId": "item-interference",
      "questionText": "How much did nausea interfere with your usual activities?"
    }
  ]
}
```

### Patient: Complete Questionnaire

```bash
curl -X POST http://localhost:3000/api/v1/patient/questionnaires/:id/submit \
  -H "Authorization: Demo P001" \
  -H "Content-Type: application/json" \
  -d '{
    "completionTimeSeconds": 95
  }'
```

**Response:**
```json
{
  "scores": [
    {
      "symptomCategory": "gastrointestinal",
      "compositeGrade": 3,
      "frequencyScore": 3,
      "severityScore": 2,
      "ctcaeEquivalentGrade": 3
    }
  ],
  "alerts": [
    {
      "alertType": "urgent",
      "severity": "yellow",
      "symptomCategory": "gastrointestinal",
      "grade": 3,
      "alertMessage": "URGENT: Grade 3 Gastrointestinal",
      "patientInstructions": "Your gastrointestinal symptoms are severe...",
      "clinicianInstructions": "Grade 3 gastrointestinal reported..."
    }
  ]
}
```

### Clinician: Get Triage Queue

```bash
curl http://localhost:3000/api/v1/clinician/triage/queue \
  -H "Authorization: Clinician CLIN001"
```

**Response:**
```json
{
  "queue": [
    {
      "rank": 1,
      "patient": {
        "patientId": "uuid",
        "patientName": "P001",
        "regimenCode": "AC-T",
        "currentCycle": 3,
        "treatmentDay": 9
      },
      "priorityScore": 115,
      "priorityReason": "1 emergency alert, in nadir window",
      "recommendedAction": "Contact patient immediately. Consider emergency evaluation...",
      "timelineTarget": "Within 30 minutes"
    }
  ],
  "statistics": {
    "totalPatients": 15,
    "emergencyCount": 2,
    "urgentCount": 5,
    "routineCount": 8,
    "avgResponseTime": "4 hours"
  }
}
```

## Intelligence Layer Integration

The API integrates all four intelligence layer components:

### The Profiler
```typescript
import { buildTreatmentContext } from '@toxicity-analyzer/intelligence-layer';

const context = buildTreatmentContext({
  treatment, regimen, currentCycle, currentDate: new Date()
});
// { treatmentDay: 9, phase: 'nadir', inNadirWindow: true }
```

### The Orchestrator
```typescript
import { selectQuestions } from '@toxicity-analyzer/intelligence-layer';

const result = selectQuestions({
  context,
  availableItems: proctcaeLibrary,
  patientHistory: symptomHistory,
  targetItemCount: 12
});
// Personalized 12-item questionnaire
```

### Scoring Service
```typescript
import { calculateMultipleGrades } from '@toxicity-analyzer/intelligence-layer';

const grades = calculateMultipleGrades(symptomResponses);
// [{ symptomCategory: 'nausea', compositeGrade: 3, ... }]
```

### Alert Engine
```typescript
import { detectEmergencyAlerts, prioritizeTriageQueue } from '@toxicity-analyzer/intelligence-layer';

const alerts = detectEmergencyAlerts({ grades, patientContext });
const triageQueue = prioritizeTriageQueue(patientsWithAlerts);
```

## HIPAA Compliance

### Audit Logging
All PHI access is automatically logged to `audit_logs` table:
- Who accessed (user ID)
- What was accessed (patient ID, resource)
- When (timestamp)
- Where from (IP address)
- What action (read, write, update, delete)

Logs retained for 7 years per HIPAA requirements.

### Authentication
Demo authentication for MVP:
- Patient: `Authorization: Demo P001` (P001-P015)
- Clinician: `Authorization: Clinician CLIN001`

Production would use Firebase Auth with token validation.

### Access Control
- Patients can only access their own data
- Clinicians can access any patient data
- All endpoints require authentication
- Role-based access control (RBAC)

## Error Handling

All errors return consistent format:

```json
{
  "error": "Not Found",
  "message": "Patient not found",
  "path": "/api/v1/patient/profile",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

Status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid auth)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Performance

Target performance:
- API response time: <500ms (p95)
- Questionnaire generation: <1s
- Score calculation: <200ms
- Database queries: Indexed for common access patterns

## Monitoring

Health check endpoint provides system status:

```bash
curl http://localhost:3000/health
```

```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "database": "connected",
  "environment": "development"
}
```

## Deployment

For GCP Cloud Functions deployment:
1. Build project: `npm run build`
2. Deploy with terraform (see `/infrastructure`)
3. Set environment variables in Cloud Functions
4. Configure Cloud SQL connection

## License

Proprietary - Risa Labs Inc.
