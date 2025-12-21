import React, { useState } from 'react';

export type QuestionnaireMode = 'drug-module' | 'regimen';

interface ModeSelectorProps {
  initialMode?: QuestionnaireMode;
  onChange: (mode: QuestionnaireMode) => void;
}

export function ModeSelector({ initialMode = 'drug-module', onChange }: ModeSelectorProps) {
  const [mode, setMode] = useState<QuestionnaireMode>(initialMode);

  const handleChange = (newMode: QuestionnaireMode) => {
    setMode(newMode);
    onChange(newMode);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Questionnaire Generation Mode
        </label>
        <p className="text-xs text-gray-600 mb-4">
          Select the approach for generating patient questionnaires. This affects how symptoms are selected and filtered.
        </p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => handleChange('drug-module')}
          className={`flex-1 px-6 py-4 rounded-lg border-2 transition-all duration-200 ${
            mode === 'drug-module'
              ? 'bg-teal-50 border-teal-600 shadow-sm'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-left">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-sm font-semibold ${
                mode === 'drug-module' ? 'text-teal-900' : 'text-gray-900'
              }`}>
                Drug-Module Approach
              </span>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                Recommended
              </span>
            </div>
            <p className="text-xs text-gray-600 mb-2">
              Superior safety signal coverage with drug-specific symptom tracking
            </p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className="flex items-start gap-1">
                <span className="text-green-600 font-bold">✓</span>
                <span>200% better safety coverage</span>
              </li>
              <li className="flex items-start gap-1">
                <span className="text-green-600 font-bold">✓</span>
                <span>Safety proxies always included</span>
              </li>
              <li className="flex items-start gap-1">
                <span className="text-green-600 font-bold">✓</span>
                <span>Granular drug tracking</span>
              </li>
            </ul>
          </div>
        </button>

        <button
          onClick={() => handleChange('regimen')}
          className={`flex-1 px-6 py-4 rounded-lg border-2 transition-all duration-200 ${
            mode === 'regimen'
              ? 'bg-blue-50 border-blue-600 shadow-sm'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-left">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-sm font-semibold ${
                mode === 'regimen' ? 'text-blue-900' : 'text-gray-900'
              }`}>
                Regimen-Phase Approach
              </span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
                Legacy
              </span>
            </div>
            <p className="text-xs text-gray-600 mb-2">
              Traditional regimen-based filtering with lower question burden
            </p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className="flex items-start gap-1">
                <span className="text-blue-600 font-bold">•</span>
                <span>Phase-filtered symptoms</span>
              </li>
              <li className="flex items-start gap-1">
                <span className="text-blue-600 font-bold">•</span>
                <span>Lower question count</span>
              </li>
              <li className="flex items-start gap-1">
                <span className="text-blue-600 font-bold">•</span>
                <span>Established clinical patterns</span>
              </li>
            </ul>
          </div>
        </button>
      </div>

      <div className={`mt-4 p-3 rounded-lg ${
        mode === 'drug-module' ? 'bg-teal-50' : 'bg-blue-50'
      }`}>
        <p className="text-xs text-gray-700">
          {mode === 'drug-module'
            ? '✅ Using drug-module approach: Critical safety symptoms (fever, chest pain, bleeding) are always monitored regardless of treatment phase.'
            : 'ℹ️ Using regimen approach: Symptoms are strictly filtered based on current treatment phase and regimen toxicity profile.'
          }
        </p>
      </div>
    </div>
  );
}
