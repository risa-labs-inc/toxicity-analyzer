# Toxicity Analyzer - Firebase Deployment Guide

This guide walks through deploying the Toxicity Analyzer system to Firebase Hosting and Google Cloud Run.

## Prerequisites

- Google Cloud Platform account with billing enabled
- Firebase CLI installed (`npm install -g firebase-tools`)
- gcloud CLI installed
- Node.js 20+ and npm 10+
- Access to the GitHub repository

---

## Architecture Overview

**Frontend:**
- Patient App → Firebase Hosting (patient.toxicity-analyzer.web.app)
- Clinician Dashboard → Firebase Hosting (clinician.toxicity-analyzer.web.app)

**Backend:**
- Express.js API → Cloud Run (toxicity-analyzer-api)
- PostgreSQL Database → Cloud SQL (toxicity-analyzer-db)

**Infrastructure:**
- Firebase Authentication for user management
- Secret Manager for credentials
- VPC connector for private database access
- GitHub Actions for CI/CD

**Estimated Monthly Cost:** ~$280/month

---

## Phase 1: Firebase Project Setup

### Step 1.1: Create Firebase Project

```bash
cd /Users/anismanjhi/Development/ToxicityAnalyzer

# Login to Firebase
firebase login

# Initialize Firebase (follow prompts)
firebase init

# Select services:
# - ✅ Hosting
# - ✅ Functions (for Cloud Run integration)
# - ❌ Firestore (using PostgreSQL instead)
```

**Important:** The project ID will be auto-generated. Note it down as you'll need it throughout.

### Step 1.2: Enable Google Cloud APIs

```bash
# Set your project ID
export PROJECT_ID=toxicity-analyzer

# Set the project
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  vpcaccess.googleapis.com \
  secretmanager.googleapis.com
```

### Step 1.3: Create VPC Connector

```bash
# Create VPC connector for Cloud SQL private IP access
gcloud compute networks vpc-access connectors create toxicity-analyzer-connector \
  --region=us-central1 \
  --network=default \
  --range=10.8.0.0/28 \
  --min-instances=2 \
  --max-instances=10
```

---

## Phase 2: Database Setup

### Step 2.1: Create Cloud SQL Instance

```bash
# Create PostgreSQL instance with private IP
gcloud sql instances create toxicity-analyzer-db \
  --database-version=POSTGRES_15 \
  --tier=db-custom-2-7680 \
  --region=us-central1 \
  --network=default \
  --no-assign-ip \
  --enable-bin-log \
  --backup-start-time=03:00

# Wait for instance to be ready (takes 5-10 minutes)
gcloud sql operations wait --operation=<operation-id>
```

### Step 2.2: Create Database and User

```bash
# Create database
gcloud sql databases create toxicity_analyzer \
  --instance=toxicity-analyzer-db

# Create database user (replace <PASSWORD> with a strong password)
gcloud sql users create toxicity_user \
  --instance=toxicity-analyzer-db \
  --password=<PASSWORD>
```

### Step 2.3: Store Credentials in Secret Manager

```bash
# Create secrets
echo -n "toxicity_user" | gcloud secrets create DB_USER \
  --data-file=- \
  --replication-policy="automatic"

echo -n "<PASSWORD>" | gcloud secrets create DB_PASSWORD \
  --data-file=- \
  --replication-policy="automatic"

# Grant Cloud Run service account access
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding DB_USER \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding DB_PASSWORD \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Step 2.4: Run Database Migrations (Local Setup)

```bash
# Install Cloud SQL Proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy

# Run proxy in a separate terminal
./cloud-sql-proxy ${PROJECT_ID}:us-central1:toxicity-analyzer-db --port=5432

# In another terminal, set environment variables
cd packages/api
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=toxicity_analyzer
export DB_USER=toxicity_user
export DB_PASSWORD=<PASSWORD>

# Run migrations
npm run migrate:latest

# Seed demo data (17 patients)
npm run seed:run
```

---

## Phase 3: Backend API Deployment

### Step 3.1: Update Configuration Files

Update `apphosting.yaml` with your project ID:

```yaml
env:
  - variable: DB_HOST
    value: "/cloudsql/<PROJECT_ID>:us-central1:toxicity-analyzer-db"
```

### Step 3.2: Build and Deploy API

```bash
# Build Docker image and deploy to Cloud Run
gcloud builds submit --config cloudbuild.yaml packages/api

# Wait for deployment (takes 5-10 minutes)
```

### Step 3.3: Verify API Deployment

```bash
# Get the Cloud Run URL
gcloud run services describe toxicity-analyzer-api \
  --region=us-central1 \
  --format="value(status.url)"

# Test health check
curl https://toxicity-analyzer-api-<PROJECT_ID>.run.app/

# Expected response:
# {"status":"ok","service":"Toxicity Analyzer API","version":"1.0.0","environment":"production"}
```

---

## Phase 4: Frontend Deployment

### Step 4.1: Configure Firebase Hosting Targets

```bash
# Apply hosting targets
firebase target:apply hosting patient-app toxicity-analyzer-patient
firebase target:apply hosting clinician-dashboard toxicity-analyzer-clinician
```

### Step 4.2: Update Production Environment Files

Get Firebase configuration from Firebase Console > Project Settings:

**packages/patient-app/.env.production:**
```env
VITE_API_URL=https://toxicity-analyzer-api-<PROJECT_ID>.run.app/api/v1
VITE_FIREBASE_API_KEY=<from Firebase console>
VITE_FIREBASE_AUTH_DOMAIN=<PROJECT_ID>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<PROJECT_ID>
VITE_FIREBASE_STORAGE_BUCKET=<PROJECT_ID>.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=<from Firebase console>
VITE_FIREBASE_APP_ID=<from Firebase console>
```

**packages/clinician-dashboard/.env.production:** (same values)

### Step 4.3: Build and Deploy Frontends

```bash
# Build both frontends
npm run build:production

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Verify deployment
# Patient App: https://toxicity-analyzer-patient.web.app
# Clinician Dashboard: https://toxicity-analyzer-clinician.web.app
```

---

## Phase 5: Firebase Authentication Setup

### Step 5.1: Enable Authentication

```bash
# Initialize Firebase Authentication
firebase init authentication

# Or enable via console:
# Firebase Console > Authentication > Get Started
```

### Step 5.2: Configure Sign-In Methods

**Enable in Firebase Console:**
1. Email/Password (for demo patients)
2. Google Sign-In (for clinicians)

### Step 5.3: Create Demo Patient Accounts

```bash
# Install Firebase Admin SDK
cd packages/api
npm install firebase-admin

# Create a script to add users (or use Firebase Console)
```

**Or via Firebase Console:**
- Go to Authentication > Users > Add User
- Create accounts for P001-P017 with custom claims

---

## Phase 6: CI/CD Setup

### Step 6.1: Create Service Accounts

```bash
# Create service account for GitHub Actions
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# Grant necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.editor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Generate key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@${PROJECT_ID}.iam.gserviceaccount.com
```

### Step 6.2: Add GitHub Secrets

Go to GitHub repo > Settings > Secrets and add:

- `FIREBASE_SERVICE_ACCOUNT`: Contents of github-actions-key.json
- `GCP_SA_KEY`: Contents of github-actions-key.json
- `PRODUCTION_API_URL`: https://toxicity-analyzer-api-<PROJECT_ID>.run.app/api/v1
- `FIREBASE_API_KEY`: From Firebase Console
- `FIREBASE_AUTH_DOMAIN`: <PROJECT_ID>.firebaseapp.com
- `FIREBASE_PROJECT_ID`: <PROJECT_ID>
- `FIREBASE_STORAGE_BUCKET`: <PROJECT_ID>.appspot.com
- `FIREBASE_MESSAGING_SENDER_ID`: From Firebase Console
- `FIREBASE_APP_ID`: From Firebase Console

### Step 6.3: Test CI/CD

```bash
# Push to main branch to trigger deployment
git add .
git commit -m "Set up Firebase deployment"
git push origin main

# Monitor deployment in GitHub Actions tab
```

---

## Post-Deployment Checklist

### ✅ Verify All Services

1. **API Health Check:**
   ```bash
   curl https://toxicity-analyzer-api-<PROJECT_ID>.run.app/health
   ```

2. **Patient App:** Visit https://toxicity-analyzer-patient.web.app
   - Login with demo patient (P001-P017)
   - Generate questionnaire (both modes)
   - Submit responses

3. **Clinician Dashboard:** Visit https://toxicity-analyzer-clinician.web.app
   - Login with clinician account
   - View triage queue
   - Check patient details

4. **Database:** Verify all 17 patients are seeded
   ```bash
   # Using Cloud SQL Proxy
   psql -h localhost -U toxicity_user -d toxicity_analyzer
   SELECT COUNT(*) FROM patients;
   # Expected: 17
   ```

### ✅ Monitor Costs

```bash
# Set up budget alerts
gcloud billing budgets create \
  --billing-account=<BILLING_ACCOUNT_ID> \
  --display-name="Toxicity Analyzer Budget Alert" \
  --budget-amount=300 \
  --threshold-rule=percent=80 \
  --threshold-rule=percent=100
```

### ✅ Set Up Logging

- Cloud Run logs: https://console.cloud.google.com/run
- Cloud SQL logs: https://console.cloud.google.com/sql
- Firebase Hosting: https://console.firebase.google.com

---

## Troubleshooting

### Issue: Cold Start Latency

**Symptom:** First API request takes 5-10 seconds

**Solution:**
```bash
# Increase min instances (costs more)
gcloud run services update toxicity-analyzer-api \
  --region=us-central1 \
  --min-instances=1
```

### Issue: Database Connection Timeout

**Symptom:** API returns 500 error, logs show "connection refused"

**Solution:**
1. Verify VPC connector is created
2. Check Cloud SQL instance is running
3. Verify Secret Manager permissions

```bash
# Check VPC connector
gcloud compute networks vpc-access connectors describe toxicity-analyzer-connector \
  --region=us-central1

# Check Cloud SQL instance
gcloud sql instances describe toxicity-analyzer-db
```

### Issue: CORS Errors in Frontend

**Symptom:** Browser console shows CORS policy errors

**Solution:**
1. Verify Firebase Hosting URLs are added to CORS whitelist in `app.ts`
2. Check API is deployed with updated CORS configuration

### Issue: Build Fails in CI/CD

**Symptom:** GitHub Actions workflow fails

**Solution:**
1. Verify all GitHub secrets are set correctly
2. Check service account has necessary permissions
3. Review error logs in GitHub Actions

---

## Rollback Procedure

### Rollback Frontend

```bash
# List recent deployments
firebase hosting:releases --only hosting:patient-app

# Rollback to previous version
firebase hosting:rollback --only hosting:patient-app
```

### Rollback API

```bash
# List recent revisions
gcloud run revisions list --service=toxicity-analyzer-api --region=us-central1

# Rollback to specific revision
gcloud run services update-traffic toxicity-analyzer-api \
  --region=us-central1 \
  --to-revisions=<REVISION_NAME>=100
```

### Rollback Database

```bash
# List backups
gcloud sql backups list --instance=toxicity-analyzer-db

# Restore from backup
gcloud sql backups restore <BACKUP_ID> \
  --backup-instance=toxicity-analyzer-db
```

---

## Cost Optimization

**Current Estimated Cost:** ~$280/month

**Optimization Strategies:**

1. **Reduce Cloud Run min instances to 0** (default - acceptable for demo)
2. **Use smaller Cloud SQL tier** during development:
   ```bash
   gcloud sql instances patch toxicity-analyzer-db \
     --tier=db-custom-1-3840
   ```
3. **Set up automatic shutdown** for non-production hours
4. **Use Cloud Storage lifecycle policies** for old backups

---

## Security Checklist

- ✅ Database uses private IP (no public access)
- ✅ Credentials stored in Secret Manager
- ✅ CORS configured with specific domains
- ✅ HTTPS enforced on all endpoints
- ✅ Firebase Authentication required for all API routes
- ✅ VPC connector restricts egress to private ranges
- ✅ Cloud Run requires authentication (can be disabled for public demo)

---

## Next Steps

1. **Custom Domain:** Configure custom domain in Firebase Hosting
2. **Monitoring:** Set up Cloud Monitoring dashboards
3. **Alerts:** Configure error rate and latency alerts
4. **Backups:** Verify automated Cloud SQL backups
5. **Documentation:** Update API documentation with production URLs
6. **Testing:** Run end-to-end tests against production environment

---

## Support

- **Firebase Documentation:** https://firebase.google.com/docs
- **Cloud Run Documentation:** https://cloud.google.com/run/docs
- **Cloud SQL Documentation:** https://cloud.google.com/sql/docs
- **GitHub Issues:** https://github.com/risa-labs-inc/toxicity-analyzer/issues

---

## Deployment Summary

**✅ Completed:**
- Firebase configuration files created
- Docker and Cloud Build setup
- API updated for Cloud Run
- Frontend production configs
- Database migration setup
- CI/CD pipeline configured

**📝 Manual Steps Required:**
1. Create Firebase project and note PROJECT_ID
2. Run `firebase init` and select services
3. Enable Google Cloud APIs
4. Create VPC connector
5. Create Cloud SQL instance
6. Run database migrations
7. Deploy API: `gcloud builds submit`
8. Configure Firebase Hosting targets
9. Update .env.production files with real values
10. Deploy frontends: `firebase deploy`
11. Set up Firebase Authentication
12. Create GitHub secrets for CI/CD

**Estimated Time:** 2-3 hours for complete setup

---

**Last Updated:** 2025-12-21
**Version:** 1.0.0
