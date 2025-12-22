import axios from 'axios';

// Clinician dashboard API client
// Use production API URL (can be overridden with VITE_API_URL env var)
const API_BASE_URL =
  typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL
    ? (import.meta as any).env.VITE_API_URL
    : 'https://toxicity-analyzer-api-4tebejtipa-uc.a.run.app/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add authorization header from localStorage
api.interceptors.request.use((config) => {
  const clinicianId = localStorage.getItem('clinicianId');
  if (clinicianId) {
    config.headers.Authorization = `Clinician ${clinicianId}`;
  }
  return config;
});

export type QuestionnaireGenerationMode = 'drug-module' | 'regimen';

export const clinicianApi = {
  // Get prioritized triage queue
  getTriageQueue: () => api.get('/clinician/triage/queue'),

  // Get patient overview
  getPatientOverview: (patientId: string) =>
    api.get(`/clinician/patients/${patientId}/overview`),

  // Get patient toxicity history
  getPatientToxicityHistory: (patientId: string) =>
    api.get(`/clinician/patients/${patientId}/toxicity-history`),

  // Get detailed questionnaire responses
  getQuestionnaireDetails: (questionnaireId: string) =>
    api.get(`/clinician/responses/${questionnaireId}/detailed`),

  // Acknowledge alert
  acknowledgeAlert: (alertId: string) =>
    api.post(`/clinician/alerts/${alertId}/acknowledge`),
};

// Patient API endpoints (for demo purposes - allows clinicians to trigger questionnaire generation)
export const patientApi = {
  // Generate questionnaire for a patient
  generateQuestionnaire: (patientId: string, mode: QuestionnaireGenerationMode = 'drug-module') =>
    api.post(`/patient/questionnaires/generate?mode=${mode}`, null, {
      headers: {
        Authorization: `Patient ${patientId}`,
      },
    }),

  // Compare both approaches
  compareApproaches: (patientId: string) =>
    api.post(`/patient/questionnaires/compare`, null, {
      headers: {
        Authorization: `Patient ${patientId}`,
      },
    }),
};

export default api;
