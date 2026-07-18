const WIDTH = 100;
const HEIGHT = 48;

export function Sparkline({
  values,
  color = "var(--color-accent-600)",
}: {
  values: (number | null)[];
  color?: string;
}) {
  const numeric = values.filter((v): v is number => v !== null);
  if (numeric.length < 2) {
    return <div style={{ fontSize: 11, color: "var(--color-ink-faint)" }}>—</div>;
  }
  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * WIDTH;
    if (v === null) return null;
    const y = HEIGHT - ((v - min) / range) * HEIGHT;
    return { x, y };
  });

  const segments: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  for (const p of points) {
    if (p === null) {
      if (current.length) segments.push(current);
      current = [];
    } else {
      current.push(p);
    }
  }
  if (current.length) segments.push(current);

  const gradientId = `spark-fill-${color.replace(/[^a-zA-Z0-9]/g, "")}`;
  const last = segments.at(-1)?.at(-1);

  return (
    <svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {segments.map((seg, i) => (
        <g key={i}>
          <polyline
            points={seg.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={color}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <polygon
            points={`${seg[0]!.x},${HEIGHT} ${seg.map((p) => `${p.x},${p.y}`).join(" ")} ${seg.at(-1)!.x},${HEIGHT}`}
            fill={`url(#${gradientId})`}
          />
        </g>
      ))}
      {last && <circle cx={last.x} cy={last.y} r="2.5" fill={color} />}
    </svg>
  );
}
