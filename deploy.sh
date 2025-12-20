#!/bin/bash

# Toxicity Analyzer - Automated GCP Deployment Script
# This script deploys the entire Toxicity Analyzer system to GCP

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="toxicity-analyzer"
REGION="us-central1"
DB_INSTANCE="toxicity-analyzer-db"
DB_NAME="toxicity_analyzer"
DB_USER="toxicity_user"
API_SERVICE="toxicity-analyzer-api"
VPC_CONNECTOR="toxicity-analyzer-connector"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Toxicity Analyzer - GCP Deployment Script             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print step
print_step() {
    echo -e "\n${GREEN}▶ $1${NC}\n"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI is not installed. Please install it from https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if firebase is installed
if ! command -v firebase &> /dev/null; then
    print_warning "firebase CLI is not installed. Installing now..."
    npm install -g firebase-tools
fi

print_step "Step 1/10: Authenticating with Google Cloud"
echo "Please complete the authentication in your browser..."
gcloud auth login
gcloud auth application-default login

print_step "Step 2/10: Creating GCP Project"
# Check if project exists
if gcloud projects describe $PROJECT_ID &>/dev/null; then
    print_warning "Project $PROJECT_ID already exists. Using existing project."
else
    gcloud projects create $PROJECT_ID --name="Toxicity Analyzer"
    print_success "Project created successfully"
fi

# Set as default project
gcloud config set project $PROJECT_ID
print_success "Active project set to $PROJECT_ID"

print_step "Step 3/10: Enabling Required GCP APIs"
echo "This may take 2-3 minutes..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    vpcaccess.googleapis.com \
    secretmanager.googleapis.com \
    compute.googleapis.com

print_success "All required APIs enabled"

print_step "Step 4/10: Setting up Billing (Manual Step Required)"
echo -e "${YELLOW}"
echo "════════════════════════════════════════════════════════════"
echo "  IMPORTANT: You must link a billing account to this project"
echo "  Visit: https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
echo "════════════════════════════════════════════════════════════"
echo -e "${NC}"
read -p "Press Enter after you have linked a billing account..."

print_step "Step 5/10: Creating VPC Connector"
# Check if connector exists
if gcloud compute networks vpc-access connectors describe $VPC_CONNECTOR --region=$REGION &>/dev/null; then
    print_warning "VPC connector already exists"
else
    echo "Creating VPC connector (this takes 5-10 minutes)..."
    gcloud compute networks vpc-access connectors create $VPC_CONNECTOR \
        --region=$REGION \
        --network=default \
        --range=10.8.0.0/28 \
        --min-instances=2 \
        --max-instances=10

    print_success "VPC connector created"
fi

print_step "Step 6/10: Creating Cloud SQL Instance"
# Check if instance exists
if gcloud sql instances describe $DB_INSTANCE &>/dev/null; then
    print_warning "Cloud SQL instance already exists"
else
    echo "Creating Cloud SQL instance (this takes 10-15 minutes)..."
    gcloud sql instances create $DB_INSTANCE \
        --database-version=POSTGRES_15 \
        --tier=db-custom-2-7680 \
        --region=$REGION \
        --network=default \
        --no-assign-ip \
        --enable-bin-log \
        --backup-start-time=03:00

    print_success "Cloud SQL instance created"
fi

# Create database
if gcloud sql databases describe $DB_NAME --instance=$DB_INSTANCE &>/dev/null; then
    print_warning "Database already exists"
else
    gcloud sql databases create $DB_NAME --instance=$DB_INSTANCE
    print_success "Database created"
fi

# Create user with secure random password
print_step "Step 7/10: Creating Database User and Storing Secrets"
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Check if user exists
if gcloud sql users list --instance=$DB_INSTANCE | grep -q $DB_USER; then
    print_warning "Database user already exists"
else
    gcloud sql users create $DB_USER \
        --instance=$DB_INSTANCE \
        --password=$DB_PASSWORD
    print_success "Database user created"
fi

# Create secrets in Secret Manager
if gcloud secrets describe DB_USER &>/dev/null; then
    print_warning "DB_USER secret already exists"
else
    echo -n "$DB_USER" | gcloud secrets create DB_USER \
        --data-file=- \
        --replication-policy="automatic"
fi

if gcloud secrets describe DB_PASSWORD &>/dev/null; then
    print_warning "DB_PASSWORD secret already exists"
else
    echo -n "$DB_PASSWORD" | gcloud secrets create DB_PASSWORD \
        --data-file=- \
        --replication-policy="automatic"
fi

# Grant Cloud Run access to secrets
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding DB_USER \
    --member="serviceAccount:$COMPUTE_SA" \
    --role="roles/secretmanager.secretAccessor" &>/dev/null

gcloud secrets add-iam-policy-binding DB_PASSWORD \
    --member="serviceAccount:$COMPUTE_SA" \
    --role="roles/secretmanager.secretAccessor" &>/dev/null

print_success "Secrets created and permissions granted"

print_step "Step 8/10: Running Database Migrations"
echo "Downloading Cloud SQL Proxy..."
if [ ! -f "cloud-sql-proxy" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
    else
        curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64
    fi
    chmod +x cloud-sql-proxy
fi

echo "Starting Cloud SQL Proxy..."
./cloud-sql-proxy $PROJECT_ID:$REGION:$DB_INSTANCE --port=5432 &
PROXY_PID=$!
sleep 5  # Wait for proxy to start

echo "Running migrations..."
cd packages/api
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=$DB_NAME
export DB_USER=$DB_USER
export DB_PASSWORD=$DB_PASSWORD

npm install
npm run migrate:latest

echo "Seeding demo data (17 patients)..."
npm run seed:run

print_success "Database migrations and seeding complete"

# Kill proxy
kill $PROXY_PID 2>/dev/null || true
cd ../..

print_step "Step 9/10: Deploying API to Cloud Run"
echo "Building and deploying API (this takes 5-10 minutes)..."

# Update apphosting.yaml with correct project ID
sed -i.bak "s/toxicity-analyzer/$PROJECT_ID/g" apphosting.yaml && rm apphosting.yaml.bak

gcloud builds submit --config cloudbuild.yaml packages/api

# Get API URL
API_URL=$(gcloud run services describe $API_SERVICE --region=$REGION --format="value(status.url)")
print_success "API deployed successfully at: $API_URL"

print_step "Step 10/10: Deploying Frontends to Firebase Hosting"
echo "Initializing Firebase..."
firebase login --no-localhost
firebase use --add $PROJECT_ID

# Configure Firebase hosting targets
firebase target:apply hosting patient-app toxicity-analyzer-patient
firebase target:apply hosting clinician-dashboard toxicity-analyzer-clinician

# Get Firebase config from console
echo -e "\n${YELLOW}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Please get your Firebase configuration:${NC}"
echo -e "${YELLOW}  1. Go to: https://console.firebase.google.com/project/$PROJECT_ID/settings/general${NC}"
echo -e "${YELLOW}  2. Scroll to 'Your apps' section${NC}"
echo -e "${YELLOW}  3. Click 'Add app' and select 'Web'${NC}"
echo -e "${YELLOW}  4. Register the app and copy the config values${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}\n"

read -p "Firebase API Key: " FIREBASE_API_KEY
read -p "Firebase Auth Domain (e.g., $PROJECT_ID.firebaseapp.com): " FIREBASE_AUTH_DOMAIN
read -p "Firebase Storage Bucket (e.g., $PROJECT_ID.appspot.com): " FIREBASE_STORAGE_BUCKET
read -p "Firebase Messaging Sender ID: " FIREBASE_SENDER_ID
read -p "Firebase App ID: " FIREBASE_APP_ID

# Update .env.production files
cat > packages/patient-app/.env.production <<EOF
VITE_API_URL=${API_URL}/api/v1
VITE_FIREBASE_API_KEY=$FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=$FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=$PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=$FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=$FIREBASE_SENDER_ID
VITE_FIREBASE_APP_ID=$FIREBASE_APP_ID
VITE_NODE_ENV=production
EOF

cat > packages/clinician-dashboard/.env.production <<EOF
VITE_API_URL=${API_URL}/api/v1
VITE_FIREBASE_API_KEY=$FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=$FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=$PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=$FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=$FIREBASE_SENDER_ID
VITE_FIREBASE_APP_ID=$FIREBASE_APP_ID
VITE_NODE_ENV=production
EOF

echo "Building production bundles..."
npm run build:production

echo "Deploying to Firebase Hosting..."
firebase deploy --only hosting

print_success "Frontends deployed successfully!"

# Get frontend URLs
PATIENT_URL=$(firebase hosting:channel:list --site toxicity-analyzer-patient 2>/dev/null | grep -o 'https://[^ ]*' | head -1)
CLINICIAN_URL=$(firebase hosting:channel:list --site toxicity-analyzer-clinician 2>/dev/null | grep -o 'https://[^ ]*' | head -1)

echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Deployment Complete! 🎉                           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📱 Patient App:${NC}            https://$PROJECT_ID-patient.web.app"
echo -e "${BLUE}🏥 Clinician Dashboard:${NC}    https://$PROJECT_ID-clinician.web.app"
echo -e "${BLUE}🔧 API:${NC}                    $API_URL"
echo -e "${BLUE}💾 Database:${NC}               $PROJECT_ID:$REGION:$DB_INSTANCE"
echo ""
echo -e "${YELLOW}📊 Estimated Monthly Cost: ~$280${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Visit the patient app and test login with demo patients (P001-P017)"
echo "2. Set up Firebase Authentication for production users"
echo "3. Configure custom domain (optional)"
echo "4. Set up monitoring and alerts"
echo ""
echo "For detailed documentation, see DEPLOYMENT.md"
echo ""
