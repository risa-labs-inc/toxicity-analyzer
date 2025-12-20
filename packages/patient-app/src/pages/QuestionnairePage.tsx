import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { patientApi } from '../services/api';

interface Question {
  itemId: string;
  itemCode: string;
  symptomCategory: string;
  attribute: string;
  questionText: string;
  responseType: string;
  responseOptions: Array<{ value: number; label: string }>;
}

export default function QuestionnairePage() {
  const { questionnaireId } = useParams<{ questionnaireId: string }>();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Map<string, { value: number; label: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuestionnaire();
  }, [questionnaireId]);

  const loadQuestionnaire = async () => {
    try {
      setLoading(true);
      const response = await patientApi.getQuestionnaire(questionnaireId!);
      setQuestions(response.data.items || []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading questionnaire:', err);
      setError(err.response?.data?.message || 'Failed to load questionnaire');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (value: number, label: string) => {
    const currentQuestion = questions[currentIndex];

    try {
      // Save response locally
      const newResponses = new Map(responses);
      newResponses.set(currentQuestion.itemId, { value, label });
      setResponses(newResponses);

      // Submit to API
      const result = await patientApi.submitResponse(questionnaireId!, {
        itemId: currentQuestion.itemId,
        responseValue: value,
        responseLabel: label,
      });

      let newQuestions = [...questions];

      // Remove questions that should be skipped (e.g., severity when frequency is "Never")
      if (result.data.skipItemIds && result.data.skipItemIds.length > 0) {
        const skipIds = new Set(result.data.skipItemIds);
        newQuestions = newQuestions.filter(q => !skipIds.has(q.itemId));
      }

      // Add branching questions if any
      if (result.data.branchingQuestions && result.data.branchingQuestions.length > 0) {
        newQuestions.splice(currentIndex + 1, 0, ...result.data.branchingQuestions);
      }

      setQuestions(newQuestions);

      // Move to next question or complete
      if (currentIndex < newQuestions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        await completeQuestionnaire();
      }
    } catch (err: any) {
      console.error('Error submitting response:', err);
      setError(err.response?.data?.message || 'Failed to submit response');
    }
  };

  const completeQuestionnaire = async () => {
    try {
      setSubmitting(true);
      await patientApi.completeQuestionnaire(questionnaireId!);
      navigate('/results');
    } catch (err: any) {
      console.error('Error completing questionnaire:', err);
      setError(err.response?.data?.message || 'Failed to complete questionnaire');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your questionnaire...</p>
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

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <p className="text-gray-600 mb-4">No questions available</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-sm font-medium text-gray-700">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="mb-6">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full mb-4">
              {currentQuestion.symptomCategory.replace(/_/g, ' ').toUpperCase()}
            </span>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {currentQuestion.questionText}
            </h2>
            <p className="text-sm text-gray-500">
              {currentQuestion.attribute.charAt(0).toUpperCase() + currentQuestion.attribute.slice(1)} Assessment
            </p>
          </div>

          {/* Response Options */}
          <div className="space-y-3">
            {currentQuestion.responseOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleResponse(option.value, option.label)}
                disabled={submitting}
                className="w-full text-left px-6 py-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{option.label}</span>
                  <span className="text-gray-400">→</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handleBack}
            disabled={currentIndex === 0 || submitting}
            className="px-6 py-3 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            ← Previous
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 text-gray-600 hover:text-gray-900 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
