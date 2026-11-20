interface CircularScoreGaugeProps {
  value: number;
  max: number;
  label: string;
  sublabel?: string;
  size?: number;
  accent?: 'burgundy' | 'white' | 'rose' | 'crimson';
}

export function CircularScoreGauge({
  value,
  max,
  label,
  sublabel,
  size = 112,
  accent = 'burgundy',
}: CircularScoreGaugeProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.min(1, Math.max(0, max > 0 ? value / max : 0));
  const offset = circumference * (1 - ratio);

  const strokeColor =
    accent === 'white'
      ? '#ffffff'
      : accent === 'rose'
        ? '#fda4af'
        : accent === 'crimson'
          ? '#e11d48'
          : '#9f1239';

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-xl font-bold tabular-nums text-white">
            {Number.isInteger(value) ? value : value.toFixed(1)}
          </span>
          <span className="font-mono text-[11px] tabular-nums text-neutral-400">
            / {max}
          </span>
        </div>
      </div>
      <div className="mt-2.5 text-sm font-medium text-white">{label}</div>
      {sublabel && <div className="text-xs text-neutral-400 mt-0.5">{sublabel}</div>}
    </div>
  );
}
