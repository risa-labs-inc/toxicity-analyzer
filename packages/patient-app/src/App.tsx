import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import QuestionnairePage from './pages/QuestionnairePage';
import ResultsPage from './pages/ResultsPage';
import { patientApi, QuestionnaireMode } from './services/api';

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
  const [generating, setGenerating] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [selectedMode, setSelectedMode] = React.useState<QuestionnaireMode>('drug-module');

  React.useEffect(() => {
    loadTreatmentInfo();
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
      const response = await patientApi.generateQuestionnaire(selectedMode);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Patient Portal</h1>
              <p className="text-xs text-gray-500">Patient ID: {patientId}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Mode Selector */}
            <div className="mb-6 bg-white rounded-xl shadow-sm p-4 border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Questionnaire Generation Mode (Demo)
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedMode('drug-module')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition text-left ${
                    selectedMode === 'drug-module'
                      ? 'bg-teal-50 border-teal-600'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-sm">Drug-Module</div>
                  <div className="text-xs text-gray-600 mt-1">Better safety coverage (Recommended)</div>
                </button>
                <button
                  onClick={() => setSelectedMode('regimen')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition text-left ${
                    selectedMode === 'regimen'
                      ? 'bg-blue-50 border-blue-600'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-sm">Regimen-Phase</div>
                  <div className="text-xs text-gray-600 mt-1">Lower question burden (Legacy)</div>
                </button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Current Treatment</h3>
                <p className="text-2xl font-bold text-gray-900">{treatmentInfo?.regimen || 'Loading...'}</p>
                <p className="text-sm text-gray-600 mt-1">Cycle {treatmentInfo?.cycle || '-'}, Day {treatmentInfo?.day || '-'}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Treatment Phase</h3>
                <p className="text-2xl font-bold text-blue-600">{treatmentInfo?.phase || 'Loading...'}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Next Action</h3>
                <p className="text-sm text-gray-900">Complete your symptom questionnaire</p>
                <button
                  onClick={handleStartQuestionnaire}
                  disabled={generating}
                  className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition"
                >
                  {generating ? 'Generating...' : 'Start Questionnaire'}
                </button>
              </div>
            </div>

            <div className="mt-8 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Welcome to Your Patient Portal</h2>
              <div className="space-y-4 text-gray-600">
                <p>This portal helps you track your cancer treatment and report any side effects you may be experiencing.</p>

                <div className="grid md:grid-cols-3 gap-4 mt-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">📋 Questionnaires</h3>
                    <p className="text-sm text-blue-800">Complete personalized symptom assessments tailored to your treatment</p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-2">📊 Track Progress</h3>
                    <p className="text-sm text-green-800">Monitor your symptoms and see trends over time</p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h3 className="font-semibold text-purple-900 mb-2">🔔 Alerts</h3>
                    <p className="text-sm text-purple-800">Receive important notifications about your care</p>
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
        <Route path="/results" element={<ResultsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
