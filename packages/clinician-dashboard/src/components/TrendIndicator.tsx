interface TrendIndicatorProps {
  trend: 'improving' | 'worsening' | 'stable';
  size?: 'sm' | 'md' | 'lg';
}

export function TrendIndicator({ trend, size = 'md' }: TrendIndicatorProps) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const trendConfig = {
    improving: {
      icon: '↓',
      color: 'text-green-600',
      bg: 'bg-green-50',
      label: 'Improving'
    },
    worsening: {
      icon: '↑',
      color: 'text-red-600',
      bg: 'bg-red-50',
      label: 'Worsening'
    },
    stable: {
      icon: '→',
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      label: 'Stable'
    }
  };

  const config = trendConfig[trend];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${config.bg} ${config.color} ${sizeClasses[size]} font-medium`}
      title={config.label}
    >
      <span className="font-bold">{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
