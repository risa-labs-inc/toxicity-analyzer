import axios from 'axios';

// Clinician dashboard API client
const API_BASE_URL = 'http://localhost:3000/api/v1';

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

export default api;
