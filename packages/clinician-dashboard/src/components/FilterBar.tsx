import React, { useState, useEffect, useRef } from 'react';

export interface FilterState {
  severity: string;
  regimen: string;
  phase: string;
  search: string;
}

interface FilterBarProps {
  onFilterChange: (filters: FilterState) => void;
  currentFilters: FilterState;
}

export default function FilterBar({ onFilterChange, currentFilters }: FilterBarProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(currentFilters);
  const [searchInput, setSearchInput] = useState(currentFilters.search);

  // Track if this is the first render
  const isFirstRender = useRef(true);

  // Debounce search input (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only update if search actually changed to avoid triggering unnecessary re-renders
      setLocalFilters((prev) => {
        if (prev.search === searchInput) return prev; // Don't create new object if unchanged
        return { ...prev, search: searchInput };
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Notify parent when filters change (but NOT on initial mount)
  useEffect(() => {
    // Skip the first render to avoid triggering load on mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    onFilterChange(localFilters);
  }, [localFilters, onFilterChange]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setLocalFilters({
      severity: '',
      regimen: '',
      phase: '',
      search: '',
    });
  };

  const hasActiveFilters =
    localFilters.severity ||
    localFilters.regimen ||
    localFilters.phase ||
    localFilters.search;

  return (
    <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 mb-6">
      <div className="flex flex-col gap-4">
        {/* Search Input - Full width */}
        <div className="w-full">
          <label htmlFor="patient-search" className="sr-only">
            Search patients
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              id="patient-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by patient name or ID..."
              className="w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
            />
          </div>
        </div>

        {/* Filter Dropdowns + Clear Button */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
          {/* Severity Filter */}
          <div className="flex-1 min-w-0">
            <label htmlFor="severity-filter" className="sr-only">
              Filter by severity
            </label>
            <select
              id="severity-filter"
              value={localFilters.severity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition bg-white"
            >
              <option value="">All Severity</option>
              <option value="red">🔴 Red (Emergency)</option>
              <option value="yellow">🟡 Yellow (Urgent)</option>
              <option value="green">🟢 Green (Routine)</option>
            </select>
          </div>

          {/* Regimen Filter */}
          <div className="flex-1 min-w-0">
            <label htmlFor="regimen-filter" className="sr-only">
              Filter by regimen
            </label>
            <select
              id="regimen-filter"
              value={localFilters.regimen}
              onChange={(e) => handleFilterChange('regimen', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition bg-white"
            >
              <option value="">All Regimens</option>
              <option value="FOLFOX">FOLFOX</option>
              <option value="AC-T">AC-T</option>
              <option value="TC">TC</option>
              <option value="Capecitabine">Capecitabine</option>
              <option value="Paclitaxel">Paclitaxel</option>
            </select>
          </div>

          {/* Phase Filter */}
          <div className="flex-1 min-w-0">
            <label htmlFor="phase-filter" className="sr-only">
              Filter by phase
            </label>
            <select
              id="phase-filter"
              value={localFilters.phase}
              onChange={(e) => handleFilterChange('phase', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition bg-white"
            >
              <option value="">All Phases</option>
              <option value="pre_session">Pre-Session</option>
              <option value="post_session">Post-Session</option>
              <option value="recovery">Recovery</option>
              <option value="nadir">Nadir</option>
              <option value="inter_cycle">Inter-Cycle</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition whitespace-nowrap min-h-[38px]"
              aria-label="Clear all filters"
            >
              <span className="hidden sm:inline">Clear Filters</span>
              <span className="sm:hidden">Clear</span>
            </button>
          )}
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500">Active filters:</span>
            {localFilters.severity && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded-full">
                Severity: {localFilters.severity}
                <button
                  onClick={() => handleFilterChange('severity', '')}
                  className="hover:text-teal-900"
                  aria-label="Remove severity filter"
                >
                  ×
                </button>
              </span>
            )}
            {localFilters.regimen && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded-full">
                Regimen: {localFilters.regimen}
                <button
                  onClick={() => handleFilterChange('regimen', '')}
                  className="hover:text-teal-900"
                  aria-label="Remove regimen filter"
                >
                  ×
                </button>
              </span>
            )}
            {localFilters.phase && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded-full">
                Phase: {localFilters.phase.replace('_', ' ')}
                <button
                  onClick={() => handleFilterChange('phase', '')}
                  className="hover:text-teal-900"
                  aria-label="Remove phase filter"
                >
                  ×
                </button>
              </span>
            )}
            {localFilters.search && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded-full">
                Search: "{localFilters.search}"
                <button
                  onClick={() => {
                    setSearchInput('');
                    handleFilterChange('search', '');
                  }}
                  className="hover:text-teal-900"
                  aria-label="Remove search filter"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
