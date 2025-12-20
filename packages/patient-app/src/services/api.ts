import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/v1';

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

export const patientApi = {
  // Get patient profile
  getProfile: () => api.get('/patient/profile'),

  // Get treatment timeline
  getTimeline: () => api.get('/patient/treatment/timeline'),

  // Generate new questionnaire
  generateQuestionnaire: () => api.post('/patient/questionnaires/generate'),

  // Get questionnaire by ID
  getQuestionnaire: (questionnaireId: string) =>
    api.get(`/patient/questionnaires/${questionnaireId}`),

  // Submit response to a question
  submitResponse: (questionnaireId: string, data: {
    itemId: string;
    responseValue: number;
    responseLabel: string;
  }) => api.post(`/patient/questionnaires/${questionnaireId}/responses`, data),

  // Complete questionnaire
  completeQuestionnaire: (questionnaireId: string) =>
    api.post(`/patient/questionnaires/${questionnaireId}/submit`),

  // Get active alerts
  getActiveAlerts: () => api.get('/patient/alerts/active'),
};

export default api;
