import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { clinicianApi } from './services/api';
import { QuestionnaireProvider, useQuestionnaire } from './contexts/QuestionnaireContext';

// ============================================
// HELPER FUNCTIONS
// ============================================

// Calculate age from date of birth
function calculateAge(dateOfBirth: Date | string | undefined): number {
  if (!dateOfBirth) return 0;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Format gender for display
function formatGender(gender: string | undefined): string {
  if (!gender) return 'Not specified';
  const genderMap: Record<string, string> = {
    'male': 'Male',
    'female': 'Female',
    'other': 'Other',
    'prefer_not_to_say': 'Prefer not to say'
  };
  return genderMap[gender] || gender;
}

// Format treatment intent
function formatTreatmentIntent(intent: string | undefined): string {
  if (!intent) return '';
  const intentMap: Record<string, string> = {
    'curative': 'Curative',
    'adjuvant': 'Adjuvant',
    'neoadjuvant': 'Neoadjuvant',
    'palliative': 'Palliative'
  };
  return intentMap[intent] || intent;
}

// Format phase for clinician dashboard (Hospital Protocol Language)
function formatPhaseForClinician(phase: string): string {
  const phaseMap: Record<string, string> = {
    'pre_session': 'Pre-Treatment Assessment',
    'post_session': 'Immediate Post-Infusion',
    'recovery': 'Peak Toxicity Period',
    'nadir': 'Myelosuppression Nadir',
    'inter_cycle': 'Recovery/Inter-Cycle'
  };
  return phaseMap[phase] || phase;
}

// ============================================
// COMPONENTS
// ============================================

// Protected Route wrapper - ensures user is logged in
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const clinicianId = localStorage.getItem('clinicianId');

  if (!clinicianId) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function LoginPage() {
  const [clinicianId, setClinicianId] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    if (clinicianId) {
      localStorage.setItem('clinicianId', clinicianId);
      setIsLoggedIn(true);
    }
  };

  if (isLoggedIn) {
    return <Navigate to="/triage" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Clinician Dashboard</h1>
          <p className="text-gray-600">Toxicity Analyzer</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clinician ID
            </label>
            <input
              type="text"
              value={clinicianId}
              onChange={(e) => setClinicianId(e.target.value)}
              placeholder="Enter your ID (e.g., CLIN001)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={!clinicianId}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200 transform hover:scale-[1.02]"
          >
            Access Dashboard
          </button>

          <div className="mt-6 p-4 bg-teal-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              Demo ID: CLIN001
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TriagePage() {
  const clinicianId = localStorage.getItem('clinicianId');
  const navigate = useNavigate();
  const [stats, setStats] = React.useState({
    totalPatients: 0,
    emergencyCount: 0,
    urgentCount: 0,
    routineCount: 0
  });

  const [patients, setPatients] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadTriageData();
  }, []);

  const loadTriageData = async () => {
    try {
      setLoading(true);
      const response = await clinicianApi.getTriageQueue();
      const { queue, statistics } = response.data;

      setPatients(queue);
      setStats({
        totalPatients: statistics.totalPatients || 0,
        emergencyCount: statistics.emergencyCount || 0,
        urgentCount: statistics.urgentCount || 0,
        routineCount: statistics.routineCount || 0
      });
      setError(null);
    } catch (err: any) {
      console.error('Error loading triage data:', err);
      setError(err.response?.data?.message || 'Failed to load triage data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('clinicianId');
    window.location.href = '/';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'red': return 'bg-red-600 text-white';
      case 'yellow': return 'bg-yellow-600 text-white';
      case 'green': return 'bg-green-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading triage data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={loadTriageData}
              className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
            >
              Retry
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Clinician Dashboard</h1>
              <p className="text-xs text-gray-500">Clinician: {clinicianId}</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={loadTriageData}
                className="px-4 py-2 text-sm text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded-lg transition"
              >
                Refresh
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Patient Queue Statistics</h2>
          <div className="grid gap-6 md:grid-cols-4">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Patients</h3>
              <p className="text-3xl font-bold text-gray-900">{stats.totalPatients}</p>
            </div>

            <div className="bg-red-50 rounded-xl shadow-sm p-6 border border-red-200">
              <h3 className="text-sm font-medium text-red-700 mb-2">Emergency</h3>
              <p className="text-3xl font-bold text-red-600">{stats.emergencyCount}</p>
              <p className="text-xs text-red-600 mt-1">Within 30 min</p>
            </div>

            <div className="bg-yellow-50 rounded-xl shadow-sm p-6 border border-yellow-200">
              <h3 className="text-sm font-medium text-yellow-700 mb-2">Urgent</h3>
              <p className="text-3xl font-bold text-yellow-600">{stats.urgentCount}</p>
              <p className="text-xs text-yellow-600 mt-1">Within 24 hours</p>
            </div>

            <div className="bg-green-50 rounded-xl shadow-sm p-6 border border-green-200">
              <h3 className="text-sm font-medium text-green-700 mb-2">Routine</h3>
              <p className="text-3xl font-bold text-green-600">{stats.routineCount}</p>
              <p className="text-xs text-green-600 mt-1">3-5 days</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Prioritized Triage Queue</h2>
          {patients.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-200 text-center">
              <div className="text-gray-400 text-5xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Patients in Queue</h3>
              <p className="text-gray-600 mb-4">
                There are no completed questionnaires to review at this time.
              </p>
              <button
                onClick={loadTriageData}
                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
              >
                Refresh Data
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {patients.map((patient) => (
              <div key={patient.rank} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition">
                <div className="flex items-start gap-6">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full ${getSeverityColor(patient.severity)} flex items-center justify-center font-bold text-lg`}>
                    #{patient.rank}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{patient.patientName}</h3>
                        <p className="text-sm text-gray-600">
                          {patient.regimen} • Cycle {patient.cycle}, Day {patient.day}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(patient.severity)}`}>
                        {patient.severity.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Priority Reason:</p>
                        <p className="text-sm text-gray-600">{patient.priorityReason}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Recommended Action:</p>
                        <p className="text-sm text-gray-600">{patient.recommendedAction}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex gap-2">
                        {patient.alerts.map((alert: string, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {alert}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/patient/${patient.patientId}`)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                        >
                          View Details
                        </button>
                        <button className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition">
                          Contact Patient
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                      Response Timeline: <span className="font-medium">{patient.timelineTarget}</span>
                    </div>
                  </div>
                </div>
              </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Helper function to format symptom names
function formatSymptomName(symptomCategory: string): string {
  if (!symptomCategory) return '';
  return symptomCategory
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function PatientDetailPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [patientData, setPatientData] = React.useState<any>(null);

  React.useEffect(() => {
    loadPatientData();
  }, [patientId]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      const response = await clinicianApi.getPatientOverview(patientId!);
      setPatientData(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading patient data:', err);
      setError(err.response?.data?.message || 'Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  // Group scores by questionnaire ID - MUST be before ALL conditional returns (Rules of Hooks)
  const groupedScores = React.useMemo(() => {
    if (!patientData?.recentScores) return [];

    // Group by questionnaire_id (all scores from same questionnaire completion)
    const groups = new Map<string, any[]>();

    patientData.recentScores.forEach((score: any) => {
      const questionnaireId = score.questionnaireId;
      if (!groups.has(questionnaireId)) {
        groups.set(questionnaireId, []);
      }
      groups.get(questionnaireId)!.push(score);
    });

    // Convert to array and sort by most recent calculatedAt timestamp descending
    return Array.from(groups.entries())
      .map(([questionnaireId, scores]) => ({
        questionnaireId,
        timestamp: scores[0].calculatedAt, // Use first score's timestamp for display
        scores: scores.sort((a, b) => (a.symptomTerm || '').localeCompare(b.symptomTerm || ''))
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10); // Show last 10 assessments
  }, [patientData?.recentScores]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patient data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const handleLogout = () => {
      localStorage.removeItem('clinicianId');
      navigate('/');
    };

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Patient</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/triage')}
              className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
            >
              Back to Triage
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!patientData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">No patient data available</p>
      </div>
    );
  }

  const { patient, timeline, recentScores, activeAlerts } = patientData;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <button
                onClick={() => navigate('/triage')}
                className="text-teal-600 hover:text-teal-700 flex items-center gap-2"
              >
                ← Back to Triage
              </button>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Patient Detail</h1>
            <div className="w-24"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Patient Header Card with Demographics */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
          {/* Header Row: Patient Name/ID + Status Badge */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Patient {patient.firebaseUid}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                MRN: {patient.medicalRecordNumber || 'N/A'} •
                Enrolled: {new Date(patient.enrollmentDate).toLocaleDateString()}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              patient.status === 'active' ? 'bg-green-100 text-green-800' :
              patient.status === 'completed' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-600'
            }`}>
              {patient.status.toUpperCase()}
            </span>
          </div>

          {/* Demographics Grid */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Age</p>
              <p className="text-lg font-semibold text-gray-900">
                {calculateAge(patient.dateOfBirth)} years
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Gender</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatGender(patient.gender)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Ethnicity</p>
              <p className="text-lg font-semibold text-gray-900">
                {patient.ethnicity || 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">ECOG Status</p>
              <p className="text-lg font-semibold text-gray-900">
                {patient.ecogBaseline !== null && patient.ecogBaseline !== undefined ? patient.ecogBaseline : 'N/A'}
              </p>
            </div>
          </div>

          {/* Comorbidities Section */}
          {patient.comorbidities && patient.comorbidities.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Comorbidities</p>
              <div className="flex flex-wrap gap-2">
                {patient.comorbidities.map((comorbidity: any, idx: number) => (
                  <span
                    key={idx}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      comorbidity.severity === 'severe' ? 'bg-red-100 text-red-800' :
                      comorbidity.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {comorbidity.condition}
                    {comorbidity.controlled && ' ✓'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Treatment Timeline Card */}
        {timeline && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Current Treatment</h3>
                <p className="text-2xl font-bold text-gray-900">{timeline.regimenName || 'Loading...'}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Cycle {timeline.currentCycle || '-'}, Day {timeline.treatmentDay || '-'}
                  {timeline.treatmentIntent && ` • ${formatTreatmentIntent(timeline.treatmentIntent)}`}
                </p>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                {formatPhaseForClinician(timeline.phase || '')}
              </span>
            </div>

            {/* Visual Timeline */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">Treatment Cycle Timeline</span>
                <span className="text-xs text-gray-500">Day {timeline.treatmentDay || '-'} of {timeline.cycleLengthDays || '21'}</span>
              </div>
              <div className="relative">
                <div className="flex items-center gap-1">
                  {[
                    { phase: 'Pre-Treatment Assessment', backendKey: 'pre_session', color: 'bg-purple-500', label: 'Pre-Tx' },
                    { phase: 'Immediate Post-Infusion', backendKey: 'post_session', color: 'bg-pink-500', label: 'Post-Inf' },
                    { phase: 'Peak Toxicity Period', backendKey: 'recovery', color: 'bg-yellow-500', label: 'Peak Tox' },
                    { phase: 'Myelosuppression Nadir', backendKey: 'nadir', color: 'bg-red-500', label: 'Nadir' },
                    { phase: 'Recovery/Inter-Cycle', backendKey: 'inter_cycle', color: 'bg-green-500', label: 'Recovery' }
                  ].map((item) => {
                    const isActive = timeline.phase === item.backendKey;
                    return (
                      <div key={item.backendKey} className="flex-1">
                        <div
                          className={`h-8 rounded transition-all ${
                            isActive
                              ? `${item.color} ring-2 ring-offset-2 ring-blue-400`
                              : 'bg-gray-200'
                          }`}
                        />
                        <p className={`text-xs text-center mt-2 ${
                          isActive ? 'font-semibold text-gray-900' : 'text-gray-500'
                        }`}>
                          {item.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Additional Treatment Info */}
            <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-xs text-gray-500">Total Planned Cycles</p>
                <p className="text-sm font-semibold text-gray-900">
                  {timeline.totalPlannedCycles || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Next Infusion</p>
                <p className="text-sm font-semibold text-gray-900">
                  {timeline.nextInfusionDate
                    ? new Date(timeline.nextInfusionDate).toLocaleDateString()
                    : 'Not scheduled'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">In Nadir Window</p>
                <p className={`text-sm font-semibold ${
                  timeline.inNadirWindow ? 'text-red-600' : 'text-green-600'
                }`}>
                  {timeline.inNadirWindow ? 'Yes - Critical Period' : 'No'}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeAlerts && activeAlerts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Active Alerts</h3>
            <div className="space-y-3">
              {activeAlerts.map((alert: any) => (
                <div
                  key={alert.alert_id}
                  className="p-4 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-red-900">{formatSymptomName(alert.symptom_term)}</p>
                      <p className="text-sm text-red-700">{alert.alert_message}</p>
                    </div>
                    <span className="px-3 py-1 bg-red-600 text-white text-xs rounded-full">
                      Grade {alert.grade}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {groupedScores && groupedScores.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Toxicity Assessments</h3>
            <div className="space-y-6">
              {groupedScores.map((assessment: any, assessmentIndex: number) => (
                <div key={assessment.questionnaireId} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Assessment header */}
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-900">
                        Assessment #{groupedScores.length - assessmentIndex}
                      </span>
                      <span className="text-sm text-gray-600">
                        {new Date(assessment.timestamp).toLocaleDateString()} at {new Date(assessment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                      </span>
                    </div>
                  </div>
                  {/* Symptoms in this assessment */}
                  <div className="divide-y divide-gray-200">
                    {assessment.scores.map((score: any) => (
                      <div key={score.scoreId} className="px-4 py-3 flex justify-between items-center">
                        <span className="text-sm text-gray-900">
                          {score.clinicalDisplayName || formatSymptomName(score.symptomTerm || score.symptomCategory)}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          score.compositeGrade >= 3 ? 'bg-red-100 text-red-800' :
                          score.compositeGrade === 2 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          Grade {score.compositeGrade}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <QuestionnaireProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route
            path="/triage"
            element={
              <ProtectedRoute>
                <TriagePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/:patientId"
            element={
              <ProtectedRoute>
                <PatientDetailPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </QuestionnaireProvider>
  );
}

export default App;
