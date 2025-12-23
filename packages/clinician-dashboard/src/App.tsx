import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { clinicianApi } from './services/api';
import { QuestionnaireProvider, useQuestionnaire } from './contexts/QuestionnaireContext';
import FilterBar, { FilterState } from './components/FilterBar';
import PaginationControls from './components/PaginationControls';
import { ToxicityTrendChart } from './components/ToxicityTrendChart';

// ============================================
// HELPER FUNCTIONS
// ============================================

// Calculate age from date of birth
function calculateAge(dateOfBirth: Date | string | undefined): number {
  if (!dateOfBirth) return 0;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Format gender for display
function formatGender(gender: string | undefined): string {
  if (!gender) return 'Not specified';
  const genderMap: Record<string, string> = {
    'male': 'Male',
    'female': 'Female',
    'other': 'Other',
    'prefer_not_to_say': 'Prefer not to say'
  };
  return genderMap[gender] || gender;
}

// Format treatment intent
function formatTreatmentIntent(intent: string | undefined): string {
  if (!intent) return '';
  const intentMap: Record<string, string> = {
    'curative': 'Curative',
    'adjuvant': 'Adjuvant',
    'neoadjuvant': 'Neoadjuvant',
    'palliative': 'Palliative'
  };
  return intentMap[intent] || intent;
}

// Format phase for clinician dashboard (Hospital Protocol Language)
function formatPhaseForClinician(phase: string): string {
  const phaseMap: Record<string, string> = {
    'pre_session': 'Pre-Treatment Assessment',
    'post_session': 'Immediate Post-Infusion',
    'recovery': 'Peak Toxicity Period',
    'nadir': 'Myelosuppression Nadir',
    'inter_cycle': 'Recovery/Inter-Cycle'
  };
  return phaseMap[phase] || phase;
}

// ============================================
// COMPONENTS
// ============================================

// Contact Patient Modal Component
function ContactPatientModal({
  isOpen,
  onClose,
  patient
}: {
  isOpen: boolean;
  onClose: () => void;
  patient: any;
}) {
  const [copySuccess, setCopySuccess] = React.useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText('555-0123');
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Contact Patient</h3>
            <p className="text-sm text-gray-600 mt-1">{patient?.patientName || 'Unknown'}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Contact Info */}
        <div className="space-y-4 mb-6">
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <p className="text-sm font-medium text-teal-900 mb-2">Phone Number</p>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-teal-700">555-0123</p>
              <button
                onClick={handleCopy}
                className="px-3 py-1 text-xs font-medium text-teal-700 bg-white border border-teal-300 rounded hover:bg-teal-50 transition"
              >
                {copySuccess ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
            <p className="font-medium text-gray-900 mb-1">Note:</p>
            <p>Contact the patient to discuss their recent questionnaire responses and address any concerns.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            Close
          </button>
          <a
            href="tel:555-0123"
            className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium text-center"
          >
            Call Now
          </a>
        </div>
      </div>
    </div>
  );
}

// Confirmation Modal Component
function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'green'
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'green' | 'red' | 'blue';
}) {
  if (!isOpen) return null;

  const colorClasses = {
    green: 'bg-green-600 hover:bg-green-700',
    red: 'bg-red-600 hover:bg-red-700',
    blue: 'bg-blue-600 hover:bg-blue-700'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        </div>

        {/* Message */}
        <div className="mb-6">
          <p className="text-gray-700 leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-3 text-white rounded-lg transition font-medium ${colorClasses[confirmColor]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Toast Notification Component
function Toast({
  isOpen,
  message,
  type = 'success',
  onClose
}: {
  isOpen: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}) {
  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const typeStyles = {
    success: 'bg-green-600 border-green-700',
    error: 'bg-red-600 border-red-700',
    info: 'bg-blue-600 border-blue-700'
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className={`${typeStyles[type]} text-white px-6 py-4 rounded-lg shadow-2xl border-2 flex items-center gap-3 min-w-[300px]`}>
        <span className="text-2xl font-bold">{icons[type]}</span>
        <p className="flex-1 font-medium">{message}</p>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 text-xl leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// Protected Route wrapper - ensures user is logged in
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const clinicianId = localStorage.getItem('clinicianId');

  if (!clinicianId) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function LoginPage() {
  const [clinicianId, setClinicianId] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    if (clinicianId) {
      localStorage.setItem('clinicianId', clinicianId);
      setIsLoggedIn(true);
    }
  };

  if (isLoggedIn) {
    return <Navigate to="/triage" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Clinician Dashboard</h1>
          <p className="text-gray-600">Toxicity Analyzer</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clinician ID
            </label>
            <input
              type="text"
              value={clinicianId}
              onChange={(e) => setClinicianId(e.target.value)}
              placeholder="Enter your ID (e.g., CLIN001)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={!clinicianId}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200 transform hover:scale-[1.02]"
          >
            Access Dashboard
          </button>

          <div className="mt-6 p-4 bg-teal-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              Demo ID: CLIN001
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TriagePage() {
  const clinicianId = localStorage.getItem('clinicianId');
  const navigate = useNavigate();
  const [stats, setStats] = React.useState({
    totalPatients: 0,
    emergencyCount: 0,
    urgentCount: 0,
    routineCount: 0
  });

  const [patients, setPatients] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalPatients, setTotalPatients] = React.useState(0);

  // Filter state
  const [filters, setFilters] = React.useState<FilterState>({
    severity: '',
    regimen: '',
    phase: '',
    search: ''
  });

  // Tab and modal state - initialize from URL query param if present
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = (searchParams.get('tab') as 'active' | 'triaged') || 'active';
  const [activeTab, setActiveTab] = React.useState<'active' | 'triaged'>(initialTab);
  const [contactModalOpen, setContactModalOpen] = React.useState(false);
  const [selectedPatient, setSelectedPatient] = React.useState<any>(null);

  // Confirmation modal state
  const [confirmModalOpen, setConfirmModalOpen] = React.useState(false);
  const [confirmModalData, setConfirmModalData] = React.useState<{
    questionnaireId: string;
    patientName: string;
  } | null>(null);

  // Toast notification state
  const [toastOpen, setToastOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [toastType, setToastType] = React.useState<'success' | 'error' | 'info'>('success');

  const loadTriageData = React.useCallback(async (
    page: number,
    filterState: FilterState,
    tab: 'active' | 'triaged'
  ) => {
    try {
      setLoading(true);

      if (tab === 'triaged') {
        // Fetch triaged cases
        const response = await clinicianApi.getTriagedCases('limit=1000');
        const { cases } = response.data;

        // Calculate statistics from triaged cases based on their original severity
        const triagedEmergencyCount = cases.filter((c: any) => c.severity === 'red').length;
        const triagedUrgentCount = cases.filter((c: any) => c.severity === 'yellow').length;
        const triagedRoutineCount = cases.filter((c: any) => c.severity === 'green').length;

        // Client-side pagination
        const limit = 10;
        const totalFiltered = cases.length;
        const totalPages = Math.ceil(totalFiltered / limit);
        const startIndex = (page - 1) * limit;
        const paginatedCases = cases.slice(startIndex, startIndex + limit);

        setPatients(paginatedCases);
        setStats({
          totalPatients: totalFiltered,
          emergencyCount: triagedEmergencyCount,
          urgentCount: triagedUrgentCount,
          routineCount: triagedRoutineCount,
        });
        setCurrentPage(page);
        setTotalPages(totalPages);
        setTotalPatients(totalFiltered);
        setError(null);
      } else {
        // Fetch ALL data from API (backend filtering not yet deployed)
        const response = await clinicianApi.getTriageQueue('limit=1000');
        const { queue, statistics } = response.data;

        // Calculate statistics from UNFILTERED data (statistics should not be affected by filters)
        const unfilteredQueue = queue || [];
        const unfilteredEmergencyCount = unfilteredQueue.filter((p: any) => p.severity === 'red').length;
        const unfilteredUrgentCount = unfilteredQueue.filter((p: any) => p.severity === 'yellow').length;
        const unfilteredRoutineCount = unfilteredQueue.filter((p: any) => p.severity === 'green').length;

        // CLIENT-SIDE FILTERING (temporary until backend is deployed)
        let filteredQueue = queue || [];

        // Apply severity filter
        if (filterState.severity) {
          filteredQueue = filteredQueue.filter((p: any) =>
            p.severity === filterState.severity
          );
        }

        // Apply regimen filter
        if (filterState.regimen) {
          filteredQueue = filteredQueue.filter((p: any) =>
            p.regimen.toLowerCase().includes(filterState.regimen.toLowerCase())
          );
        }

        // Apply search filter (patient ID or name)
        if (filterState.search) {
          const search = filterState.search.toLowerCase();
          filteredQueue = filteredQueue.filter((p: any) =>
            p.patientId.toLowerCase().includes(search) ||
            p.patientName.toLowerCase().includes(search)
          );
        }

        // Calculate client-side pagination
        const limit = 10;
        const totalFiltered = filteredQueue.length;
        const totalPages = Math.ceil(totalFiltered / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedQueue = filteredQueue.slice(startIndex, endIndex);

        setPatients(paginatedQueue);
        // Use unfiltered statistics
        setStats({
          totalPatients: unfilteredQueue.length,
          emergencyCount: unfilteredEmergencyCount,
          urgentCount: unfilteredUrgentCount,
          routineCount: unfilteredRoutineCount
        });

        setCurrentPage(page);
        setTotalPages(totalPages);
        setTotalPatients(totalFiltered);
        setError(null);
      }
    } catch (err: any) {
      console.error('Error loading triage data:', err);
      setError(err.response?.data?.message || 'Failed to load triage data');
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array - function doesn't close over any state

  const handleFilterChange = React.useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to page 1 when filters change
    loadTriageData(1, newFilters, activeTab);
  }, [loadTriageData, activeTab]);

  const handlePageChange = React.useCallback((page: number) => {
    setCurrentPage(page);
    loadTriageData(page, filters, activeTab);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top
  }, [loadTriageData, filters, activeTab]);

  const handleTabChange = React.useCallback((tab: 'active' | 'triaged') => {
    setActiveTab(tab);
    setCurrentPage(1);
    setFilters({ severity: '', regimen: '', phase: '', search: '' });
    loadTriageData(1, { severity: '', regimen: '', phase: '', search: '' }, tab);
  }, [loadTriageData]);

  const handleMarkTriaged = (questionnaireId: string, patientName: string) => {
    setConfirmModalData({ questionnaireId, patientName });
    setConfirmModalOpen(true);
  };

  const confirmMarkTriaged = async () => {
    if (!confirmModalData) return;

    try {
      await clinicianApi.markTriaged(confirmModalData.questionnaireId);

      // Switch to Triaged Cases tab and reload data
      setActiveTab('triaged');
      setCurrentPage(1);
      loadTriageData(1, filters, 'triaged');

      // Show success toast
      setToastMessage(`${confirmModalData.patientName} has been marked as triaged`);
      setToastType('success');
      setToastOpen(true);
    } catch (err: any) {
      console.error('Error marking as triaged:', err);
      setToastMessage(err.response?.data?.message || 'Failed to mark as triaged');
      setToastType('error');
      setToastOpen(true);
    }
  };

  const handleContactPatient = (patient: any) => {
    setSelectedPatient(patient);
    setContactModalOpen(true);
  };

  const handleCloseContactModal = () => {
    setContactModalOpen(false);
    setSelectedPatient(null);
  };

  // Load initial data on mount - independent of FilterBar
  React.useEffect(() => {
    loadTriageData(1, filters, activeTab);
  }, [activeTab]); // Load when tab changes

  const handleLogout = () => {
    localStorage.removeItem('clinicianId');
    window.location.href = '/';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'red': return 'bg-red-600 text-white';
      case 'yellow': return 'bg-yellow-600 text-white';
      case 'green': return 'bg-green-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading triage data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => loadTriageData(currentPage, filters, activeTab)}
              className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
            >
              Retry
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">Clinician Dashboard</h1>
              <p className="text-xs text-gray-500 truncate">Clinician: {clinicianId}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => loadTriageData(currentPage, filters, activeTab)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded-lg transition min-h-[44px]"
              >
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">↻</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition min-h-[44px]"
              >
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Exit</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => handleTabChange('active')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === 'active'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Active Queue
                {activeTab === 'active' && stats.totalPatients > 0 && (
                  <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-teal-100 text-teal-800">
                    {stats.totalPatients}
                  </span>
                )}
              </button>
              <button
                onClick={() => handleTabChange('triaged')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === 'triaged'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Triaged Cases
                {activeTab === 'triaged' && stats.totalPatients > 0 && (
                  <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-teal-100 text-teal-800">
                    {stats.totalPatients}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>

        {/* Queue Statistics */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Queue Statistics</h2>
          <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-2 lg:grid-cols-4">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2">Total Patients</h3>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalPatients}</p>
            </div>

            <div className="bg-red-50 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-red-200">
              <h3 className="text-xs sm:text-sm font-medium text-red-700 mb-1 sm:mb-2">Emergency</h3>
              <p className="text-2xl sm:text-3xl font-bold text-red-600">{stats.emergencyCount}</p>
              <p className="text-xs text-red-600 mt-1">Within 30 min</p>
            </div>

            <div className="bg-yellow-50 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-yellow-200">
              <h3 className="text-xs sm:text-sm font-medium text-yellow-700 mb-1 sm:mb-2">Urgent</h3>
              <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{stats.urgentCount}</p>
              <p className="text-xs text-yellow-600 mt-1">Within 24 hrs</p>
            </div>

            <div className="bg-green-50 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-green-200">
              <h3 className="text-xs sm:text-sm font-medium text-green-700 mb-1 sm:mb-2">Routine</h3>
              <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.routineCount}</p>
              <p className="text-xs text-green-600 mt-1">3-5 days</p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
            <p className="text-xs sm:text-sm text-gray-600">
              Showing {patients.length} of {totalPatients} patients
            </p>
          </div>

          {/* Filter Bar Component */}
          <FilterBar
            currentFilters={filters}
            onFilterChange={handleFilterChange}
          />

          {patients.length === 0 && !loading ? (
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-8 sm:p-12 border border-gray-200 text-center">
              <div className="text-gray-400 text-4xl sm:text-5xl mb-4">📋</div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                {(filters.severity || filters.regimen || filters.phase || filters.search)
                  ? 'No Patients Match Your Filters'
                  : 'No Patients in Queue'}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4">
                {(filters.severity || filters.regimen || filters.phase || filters.search)
                  ? 'Try adjusting your filter criteria to see more results.'
                  : 'There are no completed questionnaires to review at this time.'}
              </p>
              <button
                onClick={() => loadTriageData(currentPage, filters, activeTab)}
                className="px-4 sm:px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition min-h-[44px] text-sm sm:text-base"
              >
                Refresh Data
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3 sm:space-y-4">
                {patients.map((patient) => (
              <div key={patient.rank} className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 hover:shadow-md transition">
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                  {/* Rank Badge */}
                  <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full ${getSeverityColor(patient.severity)} flex items-center justify-center font-bold text-base sm:text-lg`}>
                    #{patient.rank}
                  </div>

                  <div className="flex-1 w-full min-w-0">
                    {/* Patient Header - Stack on mobile */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{patient.patientName}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {patient.regimen} • Cycle {patient.cycle}, Day {patient.day}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(patient.severity)} self-start`}>
                        {patient.severity.toUpperCase()}
                      </span>
                    </div>

                    {/* Info Grid - Stack on mobile */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1">Priority Reason:</p>
                        <p className="text-xs sm:text-sm text-gray-600">{patient.priorityReason}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1">Recommended Action:</p>
                        <p className="text-xs sm:text-sm text-gray-600">{patient.recommendedAction}</p>
                      </div>
                    </div>

                    {/* Alerts and Actions - Stack on mobile */}
                    <div className="flex flex-col gap-3 pt-3 sm:pt-4 border-t border-gray-100">
                      {/* Alerts - Only show if present */}
                      {patient.alerts && patient.alerts.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {patient.alerts.slice(0, 3).map((alert: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs whitespace-nowrap">
                              {alert ? alert.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : ''}
                            </span>
                          ))}
                          {patient.alerts.length > 3 && (
                            <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs whitespace-nowrap">
                              +{patient.alerts.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action Buttons - Full width on mobile */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => navigate(`/patient/${patient.patientId}?from=${activeTab}`)}
                          className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition min-h-[44px]"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleContactPatient(patient)}
                          className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition min-h-[44px]"
                        >
                          Contact Patient
                        </button>
                        {activeTab === 'active' && (
                          <button
                            onClick={() => handleMarkTriaged(patient.questionnaireId, patient.patientName)}
                            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition min-h-[44px]"
                          >
                            Mark as Triaged
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="mt-2 text-xs text-gray-500">
                      Response Timeline: <span className="font-medium">{patient.timelineTarget}</span>
                    </div>
                  </div>
                </div>
              </div>
              ))}
              </div>

              {/* Pagination Controls */}
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                loading={loading}
              />
            </>
          )}
        </div>
      </main>

      {/* Contact Patient Modal */}
      <ContactPatientModal
        isOpen={contactModalOpen}
        onClose={handleCloseContactModal}
        patient={selectedPatient}
      />

      {/* Confirmation Modal for Mark as Triaged */}
      <ConfirmationModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={confirmMarkTriaged}
        title="Mark Patient as Triaged"
        message={`Mark ${confirmModalData?.patientName || 'this patient'} as triaged? They will be moved from the active queue to the triaged cases tab.`}
        confirmText="Mark as Triaged"
        cancelText="Cancel"
        confirmColor="green"
      />

      {/* Toast Notification */}
      <Toast
        isOpen={toastOpen}
        message={toastMessage}
        type={toastType}
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}

// Helper function to format symptom names
function formatSymptomName(symptomCategory: string): string {
  if (!symptomCategory) return '';
  return symptomCategory
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function PatientDetailPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [patientData, setPatientData] = React.useState<any>(null);
  const [contactModalOpen, setContactModalOpen] = React.useState(false);

  // Get source tab from URL query parameter
  const searchParams = new URLSearchParams(window.location.search);
  const sourceTab = searchParams.get('from') as 'active' | 'triaged' | null;
  const isFromTriaged = sourceTab === 'triaged';

  // Confirmation modal state
  const [confirmModalOpen, setConfirmModalOpen] = React.useState(false);

  // Toast notification state
  const [toastOpen, setToastOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [toastType, setToastType] = React.useState<'success' | 'error' | 'info'>('success');

  React.useEffect(() => {
    loadPatientData();
  }, [patientId]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      const response = await clinicianApi.getPatientOverview(patientId!);
      setPatientData(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading patient data:', err);
      setError(err.response?.data?.message || 'Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkTriaged = () => {
    setConfirmModalOpen(true);
  };

  const confirmMarkTriaged = async () => {
    if (!patientData?.recentQuestionnaires?.[0]) {
      setToastMessage('No questionnaire found to mark as triaged');
      setToastType('error');
      setToastOpen(true);
      return;
    }

    try {
      await clinicianApi.markTriaged(patientData.recentQuestionnaires[0].questionnaire_id);

      const patientName = patientData.patient?.fullName || patientData.patient?.firebaseUid || 'Patient';
      setToastMessage(`${patientName} has been marked as triaged`);
      setToastType('success');
      setToastOpen(true);

      // Navigate back to triage after a short delay
      setTimeout(() => {
        navigate('/triage');
      }, 1500);
    } catch (err: any) {
      console.error('Error marking as triaged:', err);
      setToastMessage(err.response?.data?.message || 'Failed to mark as triaged');
      setToastType('error');
      setToastOpen(true);
    }
  };

  // Group scores by questionnaire ID - MUST be before ALL conditional returns (Rules of Hooks)
  const groupedScores = React.useMemo(() => {
    if (!patientData?.recentScores) return [];

    // Group by questionnaire_id (all scores from same questionnaire completion)
    const groups = new Map<string, any[]>();

    patientData.recentScores.forEach((score: any) => {
      const questionnaireId = score.questionnaireId;
      if (!groups.has(questionnaireId)) {
        groups.set(questionnaireId, []);
      }
      groups.get(questionnaireId)!.push(score);
    });

    // Convert to array and sort by most recent calculatedAt timestamp descending
    return Array.from(groups.entries())
      .map(([questionnaireId, scores]) => ({
        questionnaireId,
        timestamp: scores[0].calculatedAt, // Use first score's timestamp for display
        scores: scores.sort((a, b) => (a.symptomTerm || '').localeCompare(b.symptomTerm || ''))
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10); // Show last 10 assessments
  }, [patientData?.recentScores]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patient data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const handleLogout = () => {
      localStorage.removeItem('clinicianId');
      navigate('/');
    };

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Patient</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/triage')}
              className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
            >
              Back to Triage
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!patientData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">No patient data available</p>
      </div>
    );
  }

  const { patient, timeline, recentScores, activeAlerts } = patientData;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <button
                onClick={() => navigate(sourceTab ? `/triage?tab=${sourceTab}` : '/triage')}
                className="text-teal-600 hover:text-teal-700 flex items-center gap-2"
              >
                ← Back to Triage
              </button>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Patient Detail</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setContactModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition"
              >
                Contact Patient
              </button>
              {!isFromTriaged && (
                <button
                  onClick={handleMarkTriaged}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition"
                >
                  Mark as Triaged
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Patient Header Card with Demographics */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
          {/* Header Row: Patient Name/ID + Status Badge */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {patient.fullName
                  ? `${patient.fullName} - ${patient.firebaseUid}`
                  : `Patient ${patient.firebaseUid}`}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                MRN: {patient.medicalRecordNumber || 'N/A'} •
                Enrolled: {new Date(patient.enrollmentDate).toLocaleDateString()}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              patient.status === 'active' ? 'bg-green-100 text-green-800' :
              patient.status === 'completed' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-600'
            }`}>
              {patient.status.toUpperCase()}
            </span>
          </div>

          {/* Demographics Grid */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Age</p>
              <p className="text-lg font-semibold text-gray-900">
                {calculateAge(patient.dateOfBirth)} years
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Gender</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatGender(patient.gender)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Ethnicity</p>
              <p className="text-lg font-semibold text-gray-900">
                {patient.ethnicity || 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">ECOG Status</p>
              <p className="text-lg font-semibold text-gray-900">
                {patient.ecogBaseline !== null && patient.ecogBaseline !== undefined ? patient.ecogBaseline : 'N/A'}
              </p>
            </div>
          </div>

          {/* Comorbidities Section */}
          {patient.comorbidities && patient.comorbidities.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Comorbidities</p>
              <div className="flex flex-wrap gap-2">
                {patient.comorbidities.map((comorbidity: any, idx: number) => (
                  <span
                    key={idx}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      comorbidity.severity === 'severe' ? 'bg-red-100 text-red-800' :
                      comorbidity.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {comorbidity.condition}
                    {comorbidity.controlled && ' ✓'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Treatment Timeline Card */}
        {timeline && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Current Treatment</h3>
                <p className="text-2xl font-bold text-gray-900">{timeline.regimenName || 'Loading...'}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Cycle {timeline.currentCycle || '-'}, Day {timeline.treatmentDay || '-'}
                  {timeline.treatmentIntent && ` • ${formatTreatmentIntent(timeline.treatmentIntent)}`}
                </p>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                {formatPhaseForClinician(timeline.phase || '')}
              </span>
            </div>

            {/* Visual Timeline */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">Treatment Cycle Timeline</span>
                <span className="text-xs text-gray-500">Day {timeline.treatmentDay || '-'} of {timeline.cycleLengthDays || '21'}</span>
              </div>
              <div className="relative">
                <div className="flex items-center gap-1">
                  {[
                    { phase: 'Pre-Treatment Assessment', backendKey: 'pre_session', color: 'bg-purple-500', label: 'Pre-Tx' },
                    { phase: 'Immediate Post-Infusion', backendKey: 'post_session', color: 'bg-pink-500', label: 'Post-Inf' },
                    { phase: 'Peak Toxicity Period', backendKey: 'recovery', color: 'bg-yellow-500', label: 'Peak Tox' },
                    { phase: 'Myelosuppression Nadir', backendKey: 'nadir', color: 'bg-red-500', label: 'Nadir' },
                    { phase: 'Recovery/Inter-Cycle', backendKey: 'inter_cycle', color: 'bg-green-500', label: 'Recovery' }
                  ].map((item) => {
                    const isActive = timeline.phase === item.backendKey;
                    return (
                      <div key={item.backendKey} className="flex-1">
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

            {/* Additional Treatment Info */}
            <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-xs text-gray-500">Total Planned Cycles</p>
                <p className="text-sm font-semibold text-gray-900">
                  {timeline.totalPlannedCycles || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Next Infusion</p>
                <p className="text-sm font-semibold text-gray-900">
                  {timeline.nextInfusionDate
                    ? new Date(timeline.nextInfusionDate).toLocaleDateString()
                    : 'Not scheduled'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">In Nadir Window</p>
                <p className={`text-sm font-semibold ${
                  timeline.inNadirWindow ? 'text-red-600' : 'text-green-600'
                }`}>
                  {timeline.inNadirWindow ? 'Yes - Critical Period' : 'No'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Symptom Trend Visualization */}
        {patientId && <ToxicityTrendChart patientId={patientId} />}

        {!isFromTriaged && activeAlerts && activeAlerts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Active Alerts</h3>
            <div className="space-y-3">
              {activeAlerts.map((alert: any) => (
                <div
                  key={alert.alert_id}
                  className="p-4 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-red-900">{formatSymptomName(alert.symptom_term)}</p>
                      <p className="text-sm text-red-700">{alert.alert_message}</p>
                    </div>
                    <span className="px-3 py-1 bg-red-600 text-white text-xs rounded-full">
                      Grade {alert.grade}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {groupedScores && groupedScores.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Toxicity Assessments</h3>
            <div className="space-y-6">
              {groupedScores.map((assessment: any, assessmentIndex: number) => (
                <div key={assessment.questionnaireId} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Assessment header */}
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-900">
                        Assessment #{groupedScores.length - assessmentIndex}
                      </span>
                      <span className="text-sm text-gray-600">
                        {new Date(assessment.timestamp).toLocaleDateString()} at {new Date(assessment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                      </span>
                    </div>
                  </div>
                  {/* Symptoms in this assessment */}
                  <div className="divide-y divide-gray-200">
                    {assessment.scores.map((score: any) => (
                      <div key={score.scoreId} className="px-4 py-3 flex justify-between items-center">
                        <span className="text-sm text-gray-900">
                          {score.clinicalDisplayName || formatSymptomName(score.symptomTerm || score.symptomCategory)}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          score.compositeGrade >= 3 ? 'bg-red-100 text-red-800' :
                          score.compositeGrade === 2 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          Grade {score.compositeGrade}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Contact Patient Modal */}
      <ContactPatientModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        patient={{
          ...patientData?.patient,
          patientName: patientData?.patient?.fullName
            ? `${patientData.patient.fullName} - ${patientData.patient.firebaseUid}`
            : patientData?.patient?.firebaseUid || 'Unknown'
        }}
      />

      {/* Confirmation Modal for Mark as Triaged */}
      <ConfirmationModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={confirmMarkTriaged}
        title="Mark Patient as Triaged"
        message={`Mark ${patientData?.patient?.fullName || patientData?.patient?.firebaseUid || 'this patient'} as triaged? They will be moved from the active queue to the triaged cases tab.`}
        confirmText="Mark as Triaged"
        cancelText="Cancel"
        confirmColor="green"
      />

      {/* Toast Notification */}
      <Toast
        isOpen={toastOpen}
        message={toastMessage}
        type={toastType}
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}

function App() {
  return (
    <QuestionnaireProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route
            path="/triage"
            element={
              <ProtectedRoute>
                <TriagePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/:patientId"
            element={
              <ProtectedRoute>
                <PatientDetailPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </QuestionnaireProvider>
  );
}

export default App;
