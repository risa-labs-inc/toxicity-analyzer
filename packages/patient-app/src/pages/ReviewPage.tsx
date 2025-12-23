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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-8 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2">Review Your Answers</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Please review your responses below. You can change any answer before submitting.
          </p>
        </div>

        {/* Responses List */}
        <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
          {responses.map((response, index) => (
            <div key={response.itemId} className="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-0">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                    <span className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 text-blue-800 text-xs sm:text-sm font-bold rounded-full flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="inline-block px-2 sm:px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                      {response.symptomCategory.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {response.attribute.charAt(0).toUpperCase() + response.attribute.slice(1)}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">
                    {response.questionText}
                  </h3>
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm sm:text-base font-medium text-gray-900">{response.responseLabel}</span>
                    </div>
                  </div>
                </div>

                {/* Change Answer Button - Full width on mobile */}
                <button
                  onClick={() => handleChangeAnswer(response.itemId)}
                  className="w-full sm:w-auto sm:ml-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors min-h-[44px]"
                >
                  Change Answer
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={handleBack}
              disabled={submitting}
              className="flex-1 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base text-gray-700 bg-gray-100 rounded-lg sm:rounded-xl hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium min-h-[44px]"
            >
              ← Go Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base bg-green-600 text-white font-semibold rounded-lg sm:rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 min-h-[44px]"
            >
              {submitting ? 'Submitting...' : 'Submit Questionnaire ✓'}
            </button>
          </div>
          <p className="text-center text-xs sm:text-sm text-gray-500 mt-3 sm:mt-4">
            {responses.length} response{responses.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
      </div>
    </div>
  );
}
