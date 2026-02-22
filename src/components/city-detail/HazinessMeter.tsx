'use client';

interface HazinessMeterProps {
  value: number;  // 0-1
  showLabel?: boolean;
}

export default function HazinessMeter({ value, showLabel = true }: HazinessMeterProps) {
  const percent = Math.round(value * 100);

  let colorClass: string;
  let label: string;
  if (value < 0.3) {
    colorClass = 'bg-blue-400';
    label = '맑음';
  } else if (value < 0.5) {
    colorClass = 'bg-green-400';
    label = '약간 흐림';
  } else if (value < 0.7) {
    colorClass = 'bg-yellow-400';
    label = '흐림';
  } else {
    colorClass = 'bg-red-400';
    label = '매우 흐림';
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-sm font-medium w-10 text-right">{percent}%</span>
      </div>
      {showLabel && (
        <span className="text-xs text-gray-500 mt-1 block">{label}</span>
      )}
    </div>
  );
}
