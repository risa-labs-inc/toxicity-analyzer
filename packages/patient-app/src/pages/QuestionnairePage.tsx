import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Map<string, { value: number; label: string }>>(new Map());
  const [selectedOption, setSelectedOption] = useState<{ value: number; label: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to render question text with timeframe badge
  const renderQuestionText = (text: string) => {
    // Check if question starts with "In the last 7 days"
    const timeframePattern = /^In the last (\d+) days?,?\s*/i;
    const match = text.match(timeframePattern);

    if (match) {
      const timeframePart = match[0].trim();
      const remainingText = text.substring(match[0].length);

      return (
        <>
          <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full mb-3">
            {timeframePart.replace(/,$/, '')}
          </span>
          <br />
          <span>{remainingText}</span>
        </>
      );
    }

    return text;
  };

  useEffect(() => {
    loadQuestionnaire();
  }, [questionnaireId]);

  // Handle edit mode - jump to specific question and pre-select existing response
  useEffect(() => {
    if (questions.length > 0) {
      const searchParams = new URLSearchParams(location.search);
      const editItemId = searchParams.get('edit');

      if (editItemId) {
        const questionIndex = questions.findIndex(q => q.itemId === editItemId);
        if (questionIndex !== -1) {
          setCurrentIndex(questionIndex);
          // Pre-select existing response if available
          const existingResponse = responses.get(editItemId);
          if (existingResponse) {
            setSelectedOption(existingResponse);
          }
        }
      }
    }
  }, [questions, location.search]);

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

  // Handle option selection (without submitting)
  const handleSelectOption = (value: number, label: string) => {
    setSelectedOption({ value, label });
  };

  // Handle "Next" button - submits response and advances
  const handleNext = async () => {
    if (!selectedOption) return;

    const currentQuestion = questions[currentIndex];
    const searchParams = new URLSearchParams(location.search);
    const editItemId = searchParams.get('edit');

    try {
      setSubmitting(true);

      // Save response locally
      const newResponses = new Map(responses);
      newResponses.set(currentQuestion.itemId, { value: selectedOption.value, label: selectedOption.label });
      setResponses(newResponses);

      // Submit to API
      const result = await patientApi.submitResponse(questionnaireId!, {
        itemId: currentQuestion.itemId,
        responseValue: selectedOption.value,
        responseLabel: selectedOption.label,
      });

      let newQuestions = [...questions];

      // Remove questions that should be skipped (e.g., severity when frequency is "Never")
      if (result.data.skipItemIds && result.data.skipItemIds.length > 0) {
        const skipIds = new Set(result.data.skipItemIds);
        newQuestions = newQuestions.filter(q => !skipIds.has(q.itemId));
      }

      // Add branching questions if any (filter out duplicates)
      if (result.data.branchingQuestions && result.data.branchingQuestions.length > 0) {
        const existingItemIds = new Set(newQuestions.map(q => q.itemId));
        const uniqueBranchingQuestions = result.data.branchingQuestions.filter(
          (bq: Question) => !existingItemIds.has(bq.itemId)
        );
        if (uniqueBranchingQuestions.length > 0) {
          newQuestions.splice(currentIndex + 1, 0, ...uniqueBranchingQuestions);
        }
      }

      setQuestions(newQuestions);

      // If in edit mode, check if there are branching questions
      if (editItemId) {
        // If branching questions were added, stay on questionnaire to answer them
        const hasBranchingQuestions = result.data.branchingQuestions && result.data.branchingQuestions.length > 0;

        if (hasBranchingQuestions && currentIndex < newQuestions.length - 1) {
          // Move to the next question (the first branching question)
          setCurrentIndex(currentIndex + 1);
          setSelectedOption(null);
        } else {
          // No branching questions, go back to review page
          navigate(`/review/${questionnaireId}`);
        }
      } else {
        // Normal flow: Move to next question or go to review page
        if (currentIndex < newQuestions.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setSelectedOption(null); // Clear selection for next question
        } else {
          // Navigate to review page instead of completing
          navigate(`/review/${questionnaireId}`);
        }
      }
    } catch (err: any) {
      console.error('Error submitting response:', err);
      setError(err.response?.data?.message || 'Failed to submit response');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-4 sm:mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs sm:text-sm font-medium text-gray-700">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-xs sm:text-sm font-medium text-gray-700">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
            <div
              className="bg-blue-600 h-2 sm:h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-8 mb-4 sm:mb-6">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">
              {renderQuestionText(currentQuestion.questionText)}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              {currentQuestion.attribute.charAt(0).toUpperCase() + currentQuestion.attribute.slice(1)} Assessment
            </p>
          </div>

          {/* Response Options */}
          <div className="space-y-2 sm:space-y-3">
            {currentQuestion.responseOptions.map((option) => {
              const isSelected = selectedOption?.value === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleSelectOption(option.value, option.label)}
                  disabled={submitting}
                  className={`w-full text-left px-4 sm:px-6 py-3 sm:py-4 border-2 rounded-lg sm:rounded-xl transition-all duration-200 min-h-[44px] ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base font-medium text-gray-900">{option.label}</span>
                    {isSelected && (
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Next Button */}
          <div className="mt-4 sm:mt-6">
            <button
              onClick={handleNext}
              disabled={!selectedOption || submitting}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-blue-600 text-white text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 min-h-[44px]"
            >
              {submitting ? 'Saving...' : (currentIndex === questions.length - 1 ? 'Review Answers' : 'Next →')}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-stretch sm:items-center gap-3 sm:gap-0">
          <button
            onClick={handleBack}
            disabled={currentIndex === 0 || submitting}
            className="px-4 sm:px-6 py-3 text-sm sm:text-base text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm min-h-[44px] order-2 sm:order-1"
          >
            ← Previous
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 sm:px-6 py-3 text-sm sm:text-base text-gray-600 hover:text-gray-900 transition min-h-[44px] order-1 sm:order-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
