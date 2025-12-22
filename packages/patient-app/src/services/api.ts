import axios from 'axios';

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
  const patientId = localStorage.getItem('patientId');
  if (patientId) {
    config.headers.Authorization = `Demo ${patientId}`;
  }
  return config;
});

export type QuestionnaireMode = 'drug-module' | 'regimen';

export const patientApi = {
  // Get patient profile
  getProfile: () => api.get('/patient/profile'),

  // Get treatment timeline
  getTimeline: () => api.get('/patient/treatment/timeline'),

  // Generate new questionnaire
  generateQuestionnaire: (mode: QuestionnaireMode = 'drug-module') =>
    api.post(`/patient/questionnaires/generate?mode=${mode}`),

  // Get questionnaire by ID
  getQuestionnaire: (questionnaireId: string) =>
    api.get(`/patient/questionnaires/${questionnaireId}`),

  // Submit response to a question
  submitResponse: (questionnaireId: string, data: {
    itemId: string;
    responseValue: number;
    responseLabel: string;
  }) => api.post(`/patient/questionnaires/${questionnaireId}/responses`, data),

  // Get all responses for a questionnaire
  getQuestionnaireResponses: (questionnaireId: string) =>
    api.get(`/patient/questionnaires/${questionnaireId}/responses`),

  // Complete questionnaire
  completeQuestionnaire: (questionnaireId: string) =>
    api.post(`/patient/questionnaires/${questionnaireId}/submit`),

  // Get active alerts
  getActiveAlerts: () => api.get('/patient/alerts/active'),
};

export default api;
