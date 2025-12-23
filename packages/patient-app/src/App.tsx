import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import QuestionnairePage from './pages/QuestionnairePage';
import ReviewPage from './pages/ReviewPage';
import ResultsPage from './pages/ResultsPage';
import { patientApi } from './services/api';

function LoginPage() {
  const [selectedPatient, setSelectedPatient] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const patients = Array.from({ length: 15 }, (_, i) => `P${String(i + 1).padStart(3, '0')}`);

  const handleLogin = () => {
    if (selectedPatient) {
      localStorage.setItem('patientId', selectedPatient);
      setIsLoggedIn(true);
    }
  };

  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Patient Portal</h1>
          <p className="text-gray-600">Toxicity Analyzer</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Your Patient ID
            </label>
            <select
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            >
              <option value="">Choose your ID...</option>
              {patients.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleLogin}
            disabled={!selectedPatient}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200 transform hover:scale-[1.02]"
          >
            Access Portal
          </button>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              Demo patients: P001 through P015
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardPage() {
  const patientId = localStorage.getItem('patientId');
  const navigate = useNavigate();
  const [treatmentInfo, setTreatmentInfo] = React.useState<{
    regimen: string;
    cycle: number;
    day: number;
    phase: string;
  } | null>(null);
  const [patientProfile, setPatientProfile] = React.useState<{
    fullName?: string;
    patientId: string;
  } | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadTreatmentInfo();
    loadPatientProfile();
  }, []);

  const loadTreatmentInfo = async () => {
    try {
      setLoading(true);
      const response = await patientApi.getTimeline();
      const timeline = response.data.timeline;
      setTreatmentInfo({
        regimen: timeline.regimenCode,
        cycle: timeline.currentCycle,
        day: timeline.treatmentDay,
        phase: formatPhase(timeline.phase)
      });
    } catch (error) {
      console.error('Error loading treatment info:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPatientProfile = async () => {
    try {
      const response = await patientApi.getProfile();
      setPatientProfile({
        fullName: response.data.patient.fullName,
        patientId: response.data.patient.patientId
      });
    } catch (error) {
      console.error('Error loading patient profile:', error);
    }
  };

  const formatPhase = (phase: string): string => {
    const phaseMap: Record<string, string> = {
      'pre_session': 'Pre-Session',
      'post_session': 'Post-Session',
      'recovery': 'Recovery',
      'nadir': 'Nadir Window',
      'inter_cycle': 'Inter-Cycle'
    };
    return phaseMap[phase] || phase;
  };

  const handleLogout = () => {
    localStorage.removeItem('patientId');
    window.location.href = '/';
  };

  const handleStartQuestionnaire = async () => {
    try {
      setGenerating(true);
      const response = await patientApi.generateQuestionnaire('drug-module');
      const questionnaireId = response.data.questionnaire.questionnaireId;
      navigate(`/questionnaire/${questionnaireId}`);
    } catch (error: any) {
      console.error('Error generating questionnaire:', error);
      alert(error.response?.data?.message || 'Failed to generate questionnaire');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex-1 min-w-0">
              <h1 className="text-sm sm:text-xl font-bold text-gray-900 truncate">Patient Portal</h1>
              {patientProfile?.fullName ? (
                <>
                  <p className="text-xs sm:text-sm text-gray-900 font-medium truncate">{patientProfile.fullName}</p>
                  <p className="text-xs text-gray-500 truncate">ID: {patientId}</p>
                </>
              ) : (
                <p className="text-xs text-gray-500 truncate">Patient ID: {patientId}</p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition min-h-[44px]"
            >
              <span className="hidden sm:inline">Logout</span>
              <span className="sm:hidden">Exit</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Treatment Timeline Card */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Current Treatment</h3>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{treatmentInfo?.regimen || 'Loading...'}</p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">Cycle {treatmentInfo?.cycle || '-'}, Day {treatmentInfo?.day || '-'}</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs sm:text-sm font-medium rounded-full self-start">
                  {treatmentInfo?.phase || 'Loading...'}
                </span>
              </div>

              {/* Timeline Visualization - Desktop Horizontal Layout */}
              <div className="mt-4 sm:mt-6 hidden sm:block">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">Treatment Cycle Timeline</span>
                </div>
                <div className="relative">
                  <div className="flex items-center gap-1">
                    {[
                      { phase: 'Pre-Session', color: 'bg-purple-500', label: 'Pre' },
                      { phase: 'Post-Session', color: 'bg-pink-500', label: 'Post' },
                      { phase: 'Nadir Window', color: 'bg-red-500', label: 'Nadir' },
                      { phase: 'Recovery', color: 'bg-yellow-500', label: 'Adjustment' },
                      { phase: 'Inter-Cycle', color: 'bg-green-500', label: 'Inter' }
                    ].map((item) => {
                      const isActive = treatmentInfo?.phase === item.phase;
                      return (
                        <div key={item.phase} className="flex-1">
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

              {/* Timeline Visualization - Mobile Vertical List */}
              <div className="mt-4 sm:hidden">
                <p className="text-xs font-medium text-gray-500 mb-3">Treatment Cycle Timeline</p>
                <div className="space-y-2">
                  {[
                    { phase: 'Pre-Session', color: 'bg-purple-500', label: 'Pre-Session' },
                    { phase: 'Post-Session', color: 'bg-pink-500', label: 'Post-Session' },
                    { phase: 'Nadir Window', color: 'bg-red-500', label: 'Nadir Window' },
                    { phase: 'Recovery', color: 'bg-yellow-500', label: 'Recovery/Adjustment' },
                    { phase: 'Inter-Cycle', color: 'bg-green-500', label: 'Inter-Cycle' }
                  ].map((item) => {
                    const isActive = treatmentInfo?.phase === item.phase;
                    return (
                      <div
                        key={item.phase}
                        className={`p-3 rounded-lg transition-all ${
                          isActive
                            ? `${item.color} text-white ring-2 ring-offset-2 ring-blue-400`
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <p className={`text-sm font-medium ${isActive ? 'font-semibold' : ''}`}>
                          {item.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
                <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Next Action</h3>
                <p className="text-sm text-gray-900 mb-4">Complete your symptom questionnaire</p>
                <button
                  onClick={handleStartQuestionnaire}
                  disabled={generating}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition transform hover:scale-[1.02] min-h-[44px] text-sm sm:text-base"
                >
                  {generating ? 'Generating...' : 'Start Questionnaire'}
                </button>
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
                <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Quick Info</h3>
                <div className="space-y-3 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">📋</span>
                    <span>Personalized symptom tracking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">📊</span>
                    <span>Monitor trends over time</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-600">🔔</span>
                    <span>Receive care notifications</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Welcome to Your Patient Portal</h2>
              <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-gray-600">
                <p>This portal helps you track your cancer treatment and report any side effects you may be experiencing.</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-6">
                  <div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
                    <h3 className="text-sm sm:text-base font-semibold text-blue-900 mb-1 sm:mb-2">📋 Questionnaires</h3>
                    <p className="text-xs sm:text-sm text-blue-800">Complete personalized symptom assessments tailored to your treatment</p>
                  </div>

                  <div className="p-3 sm:p-4 bg-green-50 rounded-lg">
                    <h3 className="text-sm sm:text-base font-semibold text-green-900 mb-1 sm:mb-2">📊 Track Progress</h3>
                    <p className="text-xs sm:text-sm text-green-800">Monitor your symptoms and see trends over time</p>
                  </div>

                  <div className="p-3 sm:p-4 bg-purple-50 rounded-lg">
                    <h3 className="text-sm sm:text-base font-semibold text-purple-900 mb-1 sm:mb-2">🔔 Alerts</h3>
                    <p className="text-xs sm:text-sm text-purple-800">Receive important notifications about your care</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/questionnaire/:questionnaireId" element={<QuestionnairePage />} />
        <Route path="/review/:questionnaireId" element={<ReviewPage />} />
        <Route path="/results/:questionnaireId" element={<ResultsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
