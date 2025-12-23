import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  TooltipProps
} from 'recharts';
import { useToxicityHistory } from '../hooks/useToxicityHistory';
import { SymptomSelector } from './SymptomSelector';
import { TimeRangeSelector } from './TimeRangeSelector';

interface ToxicityTrendChartProps {
  patientId: string;
}

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

// Custom tooltip component
function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
      <p className="text-sm font-semibold text-gray-900 mb-2">
        Assessment #{label}
      </p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-700">{formatSymptomName(entry.name || '')}:</span>
          <span className="font-semibold" style={{ color: getGradeColor(Number(entry.value)) }}>
            Grade {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatSymptomName(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getGradeColor(grade: number): string {
  if (grade === 0) return '#6b7280';
  if (grade === 1) return '#22c55e';
  if (grade === 2) return '#eab308';
  if (grade >= 3) return '#ef4444';
  return '#6b7280';
}

export function ToxicityTrendChart({ patientId }: ToxicityTrendChartProps) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  const { data, loading, error } = useToxicityHistory({
    patientId,
    selectedSymptoms,
    timeRange: 'all'
  });

  // Debug logging
  console.log('[ToxicityTrendChart] Render:', {
    patientId,
    loading,
    error: error?.message,
    symptomsCount: data.symptoms.length,
    dataPointsCount: data.dataPoints.length
  });

  // Auto-select all symptoms if none are selected and data is loaded
  React.useEffect(() => {
    if (!loading && data.symptoms.length > 0 && selectedSymptoms.length === 0) {
      const allSymptoms = data.symptoms.map(s => s.name);
      setSelectedSymptoms(allSymptoms.slice(0, 3)); // Auto-select first 3 symptoms
    }
  }, [loading, data.symptoms, selectedSymptoms.length]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading symptom trends...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="text-center py-12">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <p className="text-gray-900 font-semibold mb-2">Error Loading Trend Data</p>
          <p className="text-gray-600 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  if (data.symptoms.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Symptom Trends Over Time</h3>
        <div className="text-center py-12">
          <div className="text-gray-400 text-5xl mb-4">📊</div>
          <p className="text-gray-900 font-semibold mb-2">No Symptom Data</p>
          <p className="text-gray-600 text-sm">
            No toxicity assessments have been recorded for this patient yet.
          </p>
        </div>
      </div>
    );
  }

  // Filter data points to only include selected symptoms
  const filteredDataPoints = data.dataPoints.map(point => {
    const filtered: any = {
      date: point.date,
      timestamp: point.timestamp
    };

    selectedSymptoms.forEach(symptom => {
      if (symptom in point) {
        filtered[symptom] = point[symptom];
      }
    });

    return filtered;
  });

  // Get selected symptom info for colors
  const selectedSymptomInfo = data.symptoms.filter(s =>
    selectedSymptoms.includes(s.name)
  );

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Symptom Trends Over Time</h3>

      <div className="mb-6">
        <SymptomSelector
          symptoms={data.symptoms}
          selected={selectedSymptoms}
          onChange={setSelectedSymptoms}
        />
      </div>

      {selectedSymptoms.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-gray-400 text-5xl mb-4">👆</div>
          <p className="text-gray-900 font-semibold mb-2">Select Symptoms to View Trends</p>
          <p className="text-gray-600 text-sm">
            Choose one or more symptoms from the dropdown above to display their trends.
          </p>
        </div>
      ) : filteredDataPoints.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-gray-400 text-5xl mb-4">📊</div>
          <p className="text-gray-900 font-semibold mb-2">No Data for Selected Symptoms</p>
          <p className="text-gray-600 text-sm">
            Try selecting different symptoms or adjusting the time range.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={filteredDataPoints}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              {/* Color zones for grade severity */}
              <ReferenceArea
                y1={0}
                y2={1.5}
                fill="#22c55e"
                fillOpacity={0.08}
                label={{ value: 'Mild', position: 'insideTopRight', fill: '#22c55e', fontSize: 12 }}
              />
              <ReferenceArea
                y1={1.5}
                y2={2.5}
                fill="#eab308"
                fillOpacity={0.08}
                label={{ value: 'Moderate', position: 'insideTopRight', fill: '#eab308', fontSize: 12 }}
              />
              <ReferenceArea
                y1={2.5}
                y2={4}
                fill="#ef4444"
                fillOpacity={0.08}
                label={{ value: 'Severe', position: 'insideTopRight', fill: '#ef4444', fontSize: 12 }}
              />

              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />

              <XAxis
                dataKey="assessmentNumber"
                tick={{ fontSize: 12 }}
                label={{ value: 'Assessment', position: 'insideBottom', offset: -5, style: { fontSize: 12 } }}
              />

              <YAxis
                domain={[0, 4]}
                ticks={[0, 1, 2, 3, 4]}
                tick={{ fontSize: 12 }}
                label={{ value: 'Grade', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              />

              <Tooltip content={<CustomTooltip />} />

              <Legend
                wrapperStyle={{ fontSize: '14px' }}
                formatter={(value) => formatSymptomName(value)}
              />

              {/* Lines for each selected symptom */}
              {selectedSymptomInfo.map((symptom, idx) => (
                <Line
                  key={symptom.name}
                  type="monotone"
                  dataKey={symptom.name}
                  stroke={symptom.color}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name={symptom.name}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

          {/* Legend explaining color zones */}
          <div className="mt-6 flex flex-wrap gap-4 justify-center text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-200 rounded" />
              <span>Grade 0-1: Mild symptoms, routine monitoring</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded" />
              <span>Grade 2: Moderate symptoms, increased attention</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-200 rounded" />
              <span>Grade 3-4: Severe symptoms, immediate action required</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
