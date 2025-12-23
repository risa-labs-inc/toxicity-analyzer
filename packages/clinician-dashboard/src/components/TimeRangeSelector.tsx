interface TimeRangeSelectorProps {
  value: 'last-4-cycles' | 'all';
  onChange: (value: 'last-4-cycles' | 'all') => void;
}

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  const options: Array<{ value: 'last-4-cycles' | 'all'; label: string }> = [
    { value: 'last-4-cycles', label: 'Last 4 Cycles' },
    { value: 'all', label: 'All Cycles' }
  ];

  return (
    <div className="inline-flex rounded-lg border border-gray-300 bg-white">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            value === option.value
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 hover:bg-gray-50'
          } ${
            option.value === 'last-4-cycles' ? 'rounded-l-lg' : 'rounded-r-lg'
          } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
