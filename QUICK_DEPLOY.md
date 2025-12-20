# Quick Deploy Reference

Fast deployment commands for experienced users. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed guide.

## Prerequisites
```bash
npm install -g firebase-tools
# gcloud CLI installed
# Node.js 20+
```

## 1. Firebase Setup (5 min)
```bash
firebase login
firebase init
# Select: Hosting, Functions

export PROJECT_ID=toxicity-analyzer
gcloud config set project $PROJECT_ID

gcloud services enable cloudbuild.googleapis.com run.googleapis.com sqladmin.googleapis.com vpcaccess.googleapis.com secretmanager.googleapis.com
```

## 2. VPC Connector (2 min)
```bash
gcloud compute networks vpc-access connectors create toxicity-analyzer-connector \
  --region=us-central1 \
  --network=default \
  --range=10.8.0.0/28
```

## 3. Database Setup (10 min)
```bash
# Create instance
gcloud sql instances create toxicity-analyzer-db \
  --database-version=POSTGRES_15 \
  --tier=db-custom-2-7680 \
  --region=us-central1 \
  --network=default \
  --no-assign-ip

# Create database and user
gcloud sql databases create toxicity_analyzer --instance=toxicity-analyzer-db
gcloud sql users create toxicity_user --instance=toxicity-analyzer-db --password=<PASSWORD>

# Store secrets
echo -n "toxicity_user" | gcloud secrets create DB_USER --data-file=- --replication-policy="automatic"
echo -n "<PASSWORD>" | gcloud secrets create DB_PASSWORD --data-file=- --replication-policy="automatic"

# Grant access
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding DB_USER --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding DB_PASSWORD --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
```

## 4. Run Migrations (5 min)
```bash
# Download and run Cloud SQL Proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy
./cloud-sql-proxy ${PROJECT_ID}:us-central1:toxicity-analyzer-db --port=5432 &

# In another terminal
cd packages/api
export DB_HOST=localhost DB_PORT=5432 DB_NAME=toxicity_analyzer DB_USER=toxicity_user DB_PASSWORD=<PASSWORD>
npm run migrate:latest
npm run seed:run
```

## 5. Deploy API (10 min)
```bash
# Update apphosting.yaml with your PROJECT_ID
gcloud builds submit --config cloudbuild.yaml packages/api

# Verify
curl https://toxicity-analyzer-api-${PROJECT_ID}.run.app/health
```

## 6. Deploy Frontends (5 min)
```bash
# Update .env.production files
# packages/patient-app/.env.production
# packages/clinician-dashboard/.env.production

# Configure targets
firebase target:apply hosting patient-app toxicity-analyzer-patient
firebase target:apply hosting clinician-dashboard toxicity-analyzer-clinician

# Build and deploy
npm run build:production
firebase deploy --only hosting
```

## 7. GitHub Actions (5 min)
```bash
# Create service account
gcloud iam service-accounts create github-actions --display-name="GitHub Actions"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" --role="roles/cloudbuild.builds.editor"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" --role="roles/run.admin"
gcloud iam service-accounts keys create github-actions-key.json --iam-account=github-actions@${PROJECT_ID}.iam.gserviceaccount.com

# Add GitHub secrets (in repo settings):
# FIREBASE_SERVICE_ACCOUNT, GCP_SA_KEY, PRODUCTION_API_URL, FIREBASE_*
```

## Total Time: ~45 minutes

## Verify Deployment
```bash
# API
curl https://toxicity-analyzer-api-${PROJECT_ID}.run.app/

# Frontends
open https://toxicity-analyzer-patient.web.app
open https://toxicity-analyzer-clinician.web.app
```

## Useful Commands

### Check Logs
```bash
gcloud run services logs read toxicity-analyzer-api --region=us-central1
gcloud sql operations list --instance=toxicity-analyzer-db
```

### Update API
```bash
gcloud builds submit --config cloudbuild.yaml packages/api
```

### Update Frontend
```bash
npm run deploy:frontend
```

### Rollback
```bash
firebase hosting:rollback --only hosting:patient-app
gcloud run services update-traffic toxicity-analyzer-api --region=us-central1 --to-revisions=<REVISION>=100
```

---

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed documentation.
