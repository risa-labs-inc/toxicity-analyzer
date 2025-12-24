import { useState, useEffect, useCallback } from 'react';
import { clinicianApi } from '../services/api';

interface ToxicityScore {
  scoreId: string;
  questionnaireId: string;
  patientId: string;
  symptomTerm: string;
  compositeGrade: number;
  frequencyScore?: number;
  severityScore?: number;
  interferenceScore?: number;
  calculatedAt: string;
}

interface SymptomInfo {
  name: string;
  latestGrade: number;
  trend: 'improving' | 'worsening' | 'stable';
  color: string;
}

interface TrendDataPoint {
  date: string;
  timestamp: number;
  assessmentNumber: number;
  [symptomName: string]: number | string; // Dynamic symptom grades
}

interface CycleMarker {
  date: Date;
  cycle: number;
}

interface UseToxicityHistoryData {
  symptoms: SymptomInfo[];
  dataPoints: TrendDataPoint[];
  cycleMarkers: CycleMarker[];
}

interface UseToxicityHistoryOptions {
  patientId: string;
  selectedSymptoms: string[];
  timeRange: 'last-4-cycles' | 'all';
}

export function useToxicityHistory(options: UseToxicityHistoryOptions) {
  const { patientId, selectedSymptoms, timeRange } = options;
  const [data, setData] = useState<UseToxicityHistoryData>({
    symptoms: [],
    dataPoints: [],
    cycleMarkers: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchToxicityHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch toxicity history from API
      const response = await clinicianApi.getPatientToxicityHistory(patientId);
      const scores: ToxicityScore[] = response.data.scores || [];
      const bySymptom: Record<string, ToxicityScore[]> = response.data.bySymptom || {};

      // Sort scores by date
      scores.sort((a, b) => new Date(a.calculatedAt).getTime() - new Date(b.calculatedAt).getTime());

      // Filter by time range if needed
      let filteredScores = scores;
      if (timeRange === 'last-4-cycles') {
        // Get unique cycle dates (estimate cycles based on date clusters)
        const cycleDates = getCycleDates(scores);
        const last4Cycles = cycleDates.slice(-4);
        const cutoffDate = last4Cycles[0];

        if (cutoffDate) {
          filteredScores = scores.filter(
            score => new Date(score.calculatedAt) >= cutoffDate
          );
        }
      }

      // Extract unique symptoms with trend info
      const symptomMap = new Map<string, SymptomInfo>();

      Object.entries(bySymptom).forEach(([symptom, symptomScores]) => {
        if (symptomScores.length === 0) return;

        // Sort by date
        const sortedScores = [...symptomScores].sort(
          (a, b) => new Date(a.calculatedAt).getTime() - new Date(b.calculatedAt).getTime()
        );

        const latestScore = sortedScores[sortedScores.length - 1];
        const previousScore = sortedScores.length > 1 ? sortedScores[sortedScores.length - 2] : null;

        // Calculate trend
        let trend: 'improving' | 'worsening' | 'stable' = 'stable';
        if (previousScore) {
          if (latestScore.compositeGrade < previousScore.compositeGrade) {
            trend = 'improving';
          } else if (latestScore.compositeGrade > previousScore.compositeGrade) {
            trend = 'worsening';
          }
        }

        // Assign color based on index (matching CHART_COLORS)
        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
        const colorIndex = symptomMap.size % colors.length;

        symptomMap.set(symptom, {
          name: symptom,
          latestGrade: latestScore.compositeGrade,
          trend,
          color: colors[colorIndex]
        });
      });

      // Filter symptoms if specific ones are selected
      let symptomsToDisplay = Array.from(symptomMap.values());
      if (selectedSymptoms.length > 0) {
        symptomsToDisplay = symptomsToDisplay.filter(s =>
          selectedSymptoms.includes(s.name)
        );
      }

      // Build data points for chart
      const dataPointMap = new Map<number, TrendDataPoint>();

      filteredScores.forEach(score => {
        const timestamp = new Date(score.calculatedAt).getTime();
        const dateStr = new Date(score.calculatedAt).toISOString();

        // Only include selected symptoms or all if none selected
        if (selectedSymptoms.length > 0 && !selectedSymptoms.includes(score.symptomTerm)) {
          return;
        }

        if (!dataPointMap.has(timestamp)) {
          dataPointMap.set(timestamp, {
            date: dateStr,
            timestamp,
            assessmentNumber: 0 // Will be set after sorting
          });
        }

        const point = dataPointMap.get(timestamp)!;
        point[score.symptomTerm] = score.compositeGrade;
      });

      const dataPoints = Array.from(dataPointMap.values()).sort(
        (a, b) => a.timestamp - b.timestamp
      );

      // Add sequential assessment numbers
      dataPoints.forEach((point, index) => {
        point.assessmentNumber = index + 1;
      });

      // Calculate cycle markers (estimate based on 21-day intervals)
      const cycleMarkers: CycleMarker[] = [];
      if (dataPoints.length > 0) {
        const firstDate = new Date(dataPoints[0].date);
        const lastDate = new Date(dataPoints[dataPoints.length - 1].date);
        const daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
        const estimatedCycles = Math.ceil(daysDiff / 21);

        for (let i = 0; i <= estimatedCycles; i++) {
          const cycleDate = new Date(firstDate);
          cycleDate.setDate(firstDate.getDate() + (i * 21));

          if (cycleDate <= lastDate) {
            cycleMarkers.push({
              date: cycleDate,
              cycle: i + 1
            });
          }
        }
      }

      setData({
        symptoms: symptomsToDisplay,
        dataPoints,
        cycleMarkers
      });
    } catch (err) {
      console.error('Error fetching toxicity history:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [patientId, selectedSymptoms, timeRange]);

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    fetchToxicityHistory();
  }, [patientId, fetchToxicityHistory]);

  /**
   * Estimate cycle dates based on clustering of assessment dates
   * Assumes assessments happen roughly weekly during cycles
   */
  const getCycleDates = (scores: ToxicityScore[]): Date[] => {
    if (scores.length === 0) return [];

    const dates = scores
      .map(s => new Date(s.calculatedAt))
      .sort((a, b) => a.getTime() - b.getTime());

    const cycles: Date[] = [dates[0]];

    // Group dates into cycles (roughly 21-day intervals)
    for (let i = 1; i < dates.length; i++) {
      const lastCycleDate = cycles[cycles.length - 1];
      const daysSince = (dates[i].getTime() - lastCycleDate.getTime()) / (1000 * 60 * 60 * 24);

      // If more than 18 days since last cycle start, consider it a new cycle
      if (daysSince >= 18) {
        cycles.push(dates[i]);
      }
    }

    return cycles;
  };

  return { data, loading, error };
}
