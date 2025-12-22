import { useNavigate } from 'react-router-dom';

export default function ResultsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-6">✅</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Questionnaire Complete!
          </h1>
          <p className="text-gray-600 mb-8">
            Thank you for completing your symptom assessment. Your responses have been submitted to your care team.
          </p>

          <div className="bg-blue-50 rounded-xl p-6 mb-8">
            <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
            <p className="text-sm text-blue-800">
              Your clinician will review your responses. If any urgent symptoms were reported,
              they will contact you within the appropriate timeframe.
            </p>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition transform hover:scale-105"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
