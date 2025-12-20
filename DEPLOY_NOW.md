# Deploy Toxicity Analyzer Now - Quick Start

## Option 1: Automated Script (Recommended) ⚡

Run the automated deployment script:

```bash
cd /Users/anismanjhi/Development/ToxicityAnalyzer
./deploy.sh
```

**What it does:**
1. ✅ Authenticates with Google Cloud
2. ✅ Creates new GCP project 'toxicity-analyzer'
3. ✅ Enables all required APIs
4. ✅ Creates VPC connector
5. ✅ Creates Cloud SQL instance and database
6. ✅ Generates secure password and stores in Secret Manager
7. ✅ Runs database migrations and seeds 17 patients
8. ✅ Deploys API to Cloud Run
9. ✅ Deploys frontends to Firebase Hosting

**Time:** ~30-40 minutes (mostly waiting for GCP resources)

**Manual steps required:**
- Link billing account (one-time)
- Get Firebase configuration from console (one-time)

---

## Option 2: Manual Step-by-Step 📝

If you prefer manual control:

### Step 1: Authenticate (2 min)
```bash
cd /Users/anismanjhi/Development/ToxicityAnalyzer
gcloud auth login
gcloud auth application-default login
```

### Step 2: Create Project (1 min)
```bash
export PROJECT_ID=toxicity-analyzer
gcloud projects create $PROJECT_ID --name="Toxicity Analyzer"
gcloud config set project $PROJECT_ID
```

### Step 3: Enable Billing
Visit: https://console.cloud.google.com/billing/linkedaccount?project=toxicity-analyzer

### Step 4: Enable APIs (3 min)
```bash
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    vpcaccess.googleapis.com \
    secretmanager.googleapis.com \
    compute.googleapis.com
```

### Step 5: Create VPC Connector (8-10 min)
```bash
gcloud compute networks vpc-access connectors create toxicity-analyzer-connector \
    --region=us-central1 \
    --network=default \
    --range=10.8.0.0/28 \
    --min-instances=2 \
    --max-instances=10
```

### Step 6: Create Cloud SQL Instance (10-15 min)
```bash
gcloud sql instances create toxicity-analyzer-db \
    --database-version=POSTGRES_15 \
    --tier=db-custom-2-7680 \
    --region=us-central1 \
    --network=default \
    --no-assign-ip \
    --enable-bin-log \
    --backup-start-time=03:00

gcloud sql databases create toxicity_analyzer \
    --instance=toxicity-analyzer-db

# Generate secure password
export DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

gcloud sql users create toxicity_user \
    --instance=toxicity-analyzer-db \
    --password=$DB_PASSWORD
```

### Step 7: Store Secrets (2 min)
```bash
echo -n "toxicity_user" | gcloud secrets create DB_USER --data-file=- --replication-policy="automatic"
echo -n "$DB_PASSWORD" | gcloud secrets create DB_PASSWORD --data-file=- --replication-policy="automatic"

PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding DB_USER \
    --member="serviceAccount:$COMPUTE_SA" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding DB_PASSWORD \
    --member="serviceAccount:$COMPUTE_SA" \
    --role="roles/secretmanager.secretAccessor"
```

### Step 8: Run Migrations (5 min)
```bash
# Download Cloud SQL Proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy

# Start proxy (in background)
./cloud-sql-proxy $PROJECT_ID:us-central1:toxicity-analyzer-db --port=5432 &
PROXY_PID=$!
sleep 5

# Run migrations
cd packages/api
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=toxicity_analyzer
export DB_USER=toxicity_user
# DB_PASSWORD already set above

npm install
npm run migrate:latest
npm run seed:run

# Stop proxy
kill $PROXY_PID
cd ../..
```

### Step 9: Deploy API (8-10 min)
```bash
# Update apphosting.yaml with your project ID (if needed)
gcloud builds submit --config cloudbuild.yaml packages/api

# Get API URL
API_URL=$(gcloud run services describe toxicity-analyzer-api --region=us-central1 --format="value(status.url)")
echo "API deployed at: $API_URL"
```

### Step 10: Deploy Frontends (5 min)
```bash
# Login to Firebase
firebase login

# Initialize Firebase (if not already done)
firebase use --add $PROJECT_ID

# Configure hosting targets
firebase target:apply hosting patient-app toxicity-analyzer-patient
firebase target:apply hosting clinician-dashboard toxicity-analyzer-clinician

# Get Firebase config from: https://console.firebase.google.com/project/$PROJECT_ID/settings/general
# Update .env.production files in packages/patient-app and packages/clinician-dashboard

# Build and deploy
npm run build:production
firebase deploy --only hosting
```

---

## Verify Deployment ✅

### Test API
```bash
API_URL=$(gcloud run services describe toxicity-analyzer-api --region=us-central1 --format="value(status.url)")
curl $API_URL/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-21T...",
  "database": "connected",
  "environment": "production"
}
```

### Test Frontends
1. **Patient App:** https://toxicity-analyzer-patient.web.app
   - Try logging in with demo patient P001-P017
   - Generate a questionnaire

2. **Clinician Dashboard:** https://toxicity-analyzer-clinician.web.app
   - Login with clinician credentials
   - View triage queue

### Check Database
```bash
./cloud-sql-proxy $PROJECT_ID:us-central1:toxicity-analyzer-db --port=5432 &
psql -h localhost -U toxicity_user -d toxicity_analyzer -c "SELECT COUNT(*) FROM patients;"
```

Expected: 17 patients

---

## Troubleshooting 🔧

### Error: "Billing must be enabled"
**Solution:** Visit https://console.cloud.google.com/billing/linkedaccount?project=toxicity-analyzer

### Error: "VPC connector creation failed"
**Solution:**
- Ensure Compute Engine API is enabled
- Check that IP range 10.8.0.0/28 is not already in use

### Error: "Cloud SQL instance creation timeout"
**Solution:** This is normal - Cloud SQL takes 10-15 minutes to provision

### Error: "CORS policy error in frontend"
**Solution:**
- Verify Firebase Hosting URLs are added to CORS whitelist in `packages/api/src/app.ts`
- Redeploy API: `gcloud builds submit --config cloudbuild.yaml packages/api`

### Error: "Database connection refused"
**Solution:**
- Check VPC connector is created: `gcloud compute networks vpc-access connectors describe toxicity-analyzer-connector --region=us-central1`
- Verify Cloud SQL instance is running: `gcloud sql instances describe toxicity-analyzer-db`
- Check secrets are accessible

---

## Cost Monitoring 💰

Set up budget alerts:
```bash
gcloud billing budgets create \
    --billing-account=$(gcloud billing accounts list --format="value(name)" | head -1) \
    --display-name="Toxicity Analyzer Budget Alert" \
    --budget-amount=300 \
    --threshold-rule=percent=80
```

---

## Next Steps 🚀

After successful deployment:

1. **Set up Firebase Authentication:**
   - Enable Email/Password and Google Sign-In
   - Create demo patient accounts
   - Create clinician accounts

2. **Configure Custom Domain** (optional):
   - Go to Firebase Console > Hosting
   - Add custom domain

3. **Set up Monitoring:**
   - Cloud Run metrics: https://console.cloud.google.com/run
   - Set up error alerts
   - Configure Cloud Logging

4. **Test End-to-End:**
   - Patient flow: Login → Generate → Complete → Submit
   - Clinician flow: Login → Triage → Patient details
   - Verify alerts are generated

5. **Review Security:**
   - Audit IAM permissions
   - Review Cloud SQL firewall rules
   - Check Secret Manager access logs

---

## Quick Commands Reference

```bash
# View API logs
gcloud run services logs read toxicity-analyzer-api --region=us-central1 --limit=50

# View Cloud SQL operations
gcloud sql operations list --instance=toxicity-analyzer-db

# Restart API
gcloud run services update toxicity-analyzer-api --region=us-central1

# Rollback frontend
firebase hosting:rollback --only hosting:patient-app

# Check costs
gcloud billing accounts get-iam-policy $(gcloud billing accounts list --format="value(name)" | head -1)

# Connect to database
./cloud-sql-proxy toxicity-analyzer:us-central1:toxicity-analyzer-db --port=5432 &
psql -h localhost -U toxicity_user -d toxicity_analyzer
```

---

**Ready to deploy? Run:** `./deploy.sh`

**Need help?** See DEPLOYMENT.md for detailed documentation
