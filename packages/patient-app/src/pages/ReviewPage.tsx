import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { patientApi } from '../services/api';

interface QuestionResponse {
  itemId: string;
  itemCode: string;
  symptomCategory: string;
  attribute: string;
  questionText: string;
  responseValue: number;
  responseLabel: string;
}

export default function ReviewPage() {
  const { questionnaireId } = useParams<{ questionnaireId: string }>();
  const navigate = useNavigate();
  const [responses, setResponses] = useState<QuestionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResponses();
  }, [questionnaireId]);

  const loadResponses = async () => {
    try {
      setLoading(true);
      const response = await patientApi.getQuestionnaireResponses(questionnaireId!);
      setResponses(response.data.responses || []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading responses:', err);
      setError(err.response?.data?.message || 'Failed to load your responses');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeAnswer = (itemId: string) => {
    navigate(`/questionnaire/${questionnaireId}?edit=${itemId}`);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await patientApi.completeQuestionnaire(questionnaireId!);
      navigate(`/results/${questionnaireId}`);
    } catch (err: any) {
      console.error('Error completing questionnaire:', err);
      setError(err.response?.data?.message || 'Failed to submit questionnaire');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate(`/questionnaire/${questionnaireId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your responses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-red-600 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Review Your Answers</h1>
          <p className="text-gray-600">
            Please review your responses below. You can change any answer before submitting.
          </p>
        </div>

        {/* Responses List */}
        <div className="space-y-4 mb-6">
          {responses.map((response, index) => (
            <div key={response.itemId} className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 text-sm font-bold rounded-full">
                      {index + 1}
                    </span>
                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                      {response.symptomCategory.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {response.attribute.charAt(0).toUpperCase() + response.attribute.slice(1)}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {response.questionText}
                  </h3>
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium text-gray-900">{response.responseLabel}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleChangeAnswer(response.itemId)}
                  className="ml-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Change Answer
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleBack}
              disabled={submitting}
              className="flex-1 px-6 py-4 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              ← Go Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 px-6 py-4 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {submitting ? 'Submitting...' : 'Submit Questionnaire ✓'}
            </button>
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">
            {responses.length} response{responses.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
      </div>
    </div>
  );
}
