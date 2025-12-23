import { useState, useRef, useEffect } from 'react';
import { TrendIndicator } from './TrendIndicator';

interface Symptom {
  name: string;
  latestGrade: number;
  trend: 'improving' | 'worsening' | 'stable';
  color: string;
}

interface SymptomSelectorProps {
  symptoms: Symptom[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function SymptomSelector({ symptoms, selected, onChange }: SymptomSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleSymptom = (symptomName: string) => {
    if (selected.includes(symptomName)) {
      onChange(selected.filter(s => s !== symptomName));
    } else {
      onChange([...selected, symptomName]);
    }
  };

  const handleSelectAll = () => {
    onChange(symptoms.map(s => s.name));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const formatSymptomName = (name: string): string => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getGradeColor = (grade: number): string => {
    if (grade === 0) return 'text-gray-600';
    if (grade === 1) return 'text-green-600';
    if (grade === 2) return 'text-yellow-600';
    if (grade >= 3) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between w-full sm:w-auto min-w-[200px] px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <span>
          {selected.length === 0
            ? 'Select Symptoms'
            : selected.length === symptoms.length
            ? 'All Symptoms'
            : `${selected.length} Symptom${selected.length > 1 ? 's' : ''}`}
        </span>
        <svg
          className={`ml-2 h-5 w-5 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-2 w-full sm:w-80 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {/* Header with Select All / Clear All */}
          <div className="sticky top-0 bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
            <span className="text-xs font-medium text-gray-700">
              {symptoms.length} Symptoms Available
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Select All
              </button>
              {selected.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Symptom List */}
          <div className="py-1">
            {symptoms.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No symptom data available
              </div>
            ) : (
              symptoms.map((symptom) => {
                const isSelected = selected.includes(symptom.name);
                return (
                  <button
                    key={symptom.name}
                    onClick={() => handleToggleSymptom(symptom.name)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        {/* Checkbox */}
                        <div
                          className={`flex-shrink-0 w-5 h-5 border-2 rounded ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300'
                          } flex items-center justify-center`}
                        >
                          {isSelected && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 12 12"
                            >
                              <path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="2" fill="none" />
                            </svg>
                          )}
                        </div>

                        {/* Symptom Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: symptom.color }}
                            />
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {formatSymptomName(symptom.name)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${getGradeColor(symptom.latestGrade)}`}>
                              Grade {symptom.latestGrade}
                            </span>
                            <TrendIndicator trend={symptom.trend} size="sm" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
