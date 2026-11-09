import { useRef } from 'react';
import { useGaze } from '../gaze';

export const INK = '#1d2a5c';

const f = (n) => n.toFixed(1);

/** Contur de floare / scoică: n petale între raza r (adâncituri) și R (vârfuri) */
export function flowerPath(cx, cy, r, R, n, rot = -Math.PI / 2) {
  const pt = (a, rad) => `${f(cx + Math.cos(a) * rad)},${f(cy + Math.sin(a) * rad)}`;
  const step = (2 * Math.PI) / n;
  let d = '';
  for (let i = 0; i < n; i += 1) {
    const a0 = rot + i * step;
    const a1 = a0 + step;
    if (i === 0) d += `M${pt(a0, r)}`;
    d += ` C${pt(a0 + step * 0.08, R)} ${pt(a1 - step * 0.08, R)} ${pt(a1, r)}`;
  }
  return `${d}Z`;
}

function starPath(cx, cy, R, r, n = 5) {
  let d = '';
  for (let i = 0; i < n * 2; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const rad = i % 2 ? r : R;
    d += `${i ? 'L' : 'M'}${f(cx + Math.cos(a) * rad)},${f(cy + Math.sin(a) * rad)}`;
  }
  return `${d}Z`;
}

/* ───────── Ochi și gură ───────── */
function Eye({ cx, cy, r, p }) {
  return (
    <g className="eye" style={{ '--m': `${r - p - 1.5}px` }}>
      <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={INK} strokeWidth="3" />
      <g className="pupil">
        <circle cx={cx} cy={cy} r={p} fill={INK} />
        <circle cx={cx - p * 0.35} cy={cy - p * 0.38} r={p * 0.3} fill="#fff" />
      </g>
    </g>
  );
}

function Brows({ eyes, color }) {
  return eyes.map((e, i) => {
    const left = i === 0;
    const y = e.cy - e.r - 5;
    const d = left
      ? `M${e.cx - e.r * 0.8} ${y + 2} L${e.cx + e.r * 0.6} ${y - 5}`
      : `M${e.cx - e.r * 0.6} ${y - 5} L${e.cx + e.r * 0.8} ${y + 2}`;
    return <path key={i} d={d} stroke={color} strokeWidth="3.5" strokeLinecap="round" />;
  });
}

function Mouth({ x, y, w, mood, color }) {
  const common = { fill: 'none', stroke: color, strokeWidth: 3.5, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (mood === 'thinking') return <ellipse cx={x} cy={y + 2} rx={4} ry={5} fill={color} />;
  if (mood === 'meh') return <path d={`M${x - w * 0.7} ${y + 2} L${x + w * 0.7} ${y + 2}`} {...common} />;
  if (mood === 'worried') return <path d={`M${x - w} ${y + 4} q${w / 2} -8 ${w} 0 t${w} 0`} {...common} />;
  return <path d={`M${x - w} ${y} Q${x} ${y + w * 0.95} ${x + w} ${y}`} {...common} />;
}

/* ───────── Personajele focus grupului ───────── */
const S = { stroke: INK, strokeWidth: 3.5, strokeLinejoin: 'round' };

const SHAPES = {
  Gender: {
    body: <path d="M60 14 C90 12 108 34 106 60 C104 90 84 110 58 108 C30 106 12 88 14 60 C16 32 32 16 60 14Z" fill="#ffb2f7" {...S} />,
    front: (
      <g {...S}>
        <path d="M76 16 L60 2 L58 26 Z" fill="#ab9dff" />
        <path d="M76 16 L94 4 L92 28 Z" fill="#ab9dff" />
        <circle cx="76" cy="16" r="5" fill="#e3fc87" />
      </g>
    ),
    eyes: [{ cx: 44, cy: 58, r: 15, p: 7 }, { cx: 76, cy: 58, r: 15, p: 7 }],
    mouth: { x: 60, y: 84, w: 11 },
    cheeks: '#ff7ccf',
  },
  GenZ: {
    back: (
      <g {...S}>
        <path d="M20 58 C18 6 102 6 100 58" fill="none" strokeWidth="6" strokeLinecap="round" />
      </g>
    ),
    body: <path d={flowerPath(60, 64, 43, 56, 9)} fill="#e3fc87" {...S} />,
    front: (
      <g {...S}>
        <rect x="8" y="46" width="16" height="28" rx="7" fill="#ffb2f7" />
        <rect x="96" y="46" width="16" height="28" rx="7" fill="#ffb2f7" />
      </g>
    ),
    eyes: [{ cx: 46, cy: 60, r: 13, p: 6.5 }, { cx: 76, cy: 58, r: 16, p: 7 }],
    mouth: { x: 61, y: 86, w: 10 },
    cheeks: '#ff9ad9',
  },
  Millennials: {
    body: <rect x="14" y="18" width="92" height="90" rx="30" fill="#88a2ff" {...S} />,
    front: (
      <g {...S}>
        <path d="M110 86 q11 0 11 9 t-11 9" fill="none" />
        <rect x="86" y="78" width="26" height="30" rx="6" fill="#fff" />
        <rect x="86" y="88" width="26" height="9" fill="#e3fc87" />
        <path d="M94 72 q-4 -6 0 -12 t0 -12 M103 72 q-4 -6 0 -12 t0 -12" fill="none" strokeWidth="2.6" strokeLinecap="round" />
      </g>
    ),
    eyes: [{ cx: 43, cy: 54, r: 15, p: 7 }, { cx: 74, cy: 54, r: 15, p: 7 }],
    mouth: { x: 58, y: 82, w: 11 },
    cheeks: '#ffb2f7',
  },
  Boomers: {
    body: <circle cx="60" cy="66" r="46" fill="#c0e0ff" {...S} />,
    front: (
      <g {...S}>
        <path d="M18 46 C20 12 100 12 102 46 Z" fill="#88a2ff" />
        <path d="M10 46 H72 Q66 55 12 52 Z" fill="#253a82" />
        <circle cx="41" cy="68" r="16" fill="none" />
        <circle cx="79" cy="68" r="16" fill="none" />
        <path d="M57 66 Q60 61 63 66" fill="none" />
        <path d="M60 90 C52 82 38 86 40 96 C46 92 54 94 60 90 C66 94 74 92 80 96 C82 86 68 82 60 90Z" fill={INK} />
      </g>
    ),
    eyes: [{ cx: 41, cy: 68, r: 12, p: 6 }, { cx: 79, cy: 68, r: 12, p: 6 }],
    mouth: { x: 60, y: 101, w: 7 },
    cheeks: '#ffb2f7',
  },
  DEI: {
    body: (
      <g {...S}>
        <path d={flowerPath(60, 62, 34, 66, 6)} fill="#ab9dff" />
        <circle cx="60" cy="62" r="31" fill="#cdc4ff" />
      </g>
    ),
    eyes: [{ cx: 48, cy: 58, r: 12, p: 6 }, { cx: 72, cy: 58, r: 12, p: 6 }],
    mouth: { x: 60, y: 77, w: 8 },
    cheeks: '#ffb2f7',
  },
  BrandSafety: {
    back: (
      <g stroke={INK} strokeWidth="3" strokeLinecap="round" className="siren-rays">
        <path d="M34 8 L26 2 M86 8 L94 2 M60 -4 V-10" />
      </g>
    ),
    body: <path d="M60 20 L104 34 C104 78 88 102 60 114 C32 102 16 78 16 34 Z" fill="#ffd54a" {...S} />,
    front: (
      <g {...S}>
        <path d="M46 20 A14 14 0 0 1 74 20 Z" fill="#ff5a7a" className="siren" />
        <rect x="42" y="18" width="36" height="7" rx="3.5" fill={INK} />
      </g>
    ),
    eyes: [{ cx: 45, cy: 54, r: 13, p: 6.5 }, { cx: 75, cy: 54, r: 13, p: 6.5 }],
    mouth: { x: 60, y: 82, w: 10 },
    cheeks: '#ff9a5a',
  },
  Legal: {
    body: (
      <g {...S}>
        <path d="M22 14 H84 L104 34 V108 Q104 113 99 113 H27 Q22 113 22 108 Z" fill="#253a82" />
        <path d="M84 14 V34 H104" fill="#c0e0ff" />
      </g>
    ),
    front: (
      <g {...S}>
        <path d="M61 94 L45 85 V103 Z M61 94 L77 85 V103 Z" fill="#e3fc87" />
        <circle cx="61" cy="94" r="5" fill="#e3fc87" />
      </g>
    ),
    eyes: [{ cx: 47, cy: 50, r: 14, p: 6.5 }, { cx: 77, cy: 50, r: 14, p: 6.5 }],
    mouth: { x: 62, y: 72, w: 10 },
    mouthColor: '#fff',
    cheeks: '#ab9dff',
  },
  Mascot: {
    body: <circle cx="60" cy="60" r="48" fill="#e3fc87" {...S} />,
    eyes: [{ cx: 43, cy: 54, r: 16, p: 7.5 }, { cx: 77, cy: 54, r: 16, p: 7.5 }],
    mouth: { x: 60, y: 82, w: 12 },
    cheeks: '#ffb2f7',
  },
};

// Personajele definite de agenție: același corp, culoarea aleasă de utilizator
const customShape = (color) => ({
  back: (
    <g {...S}>
      <path d="M60 22 V6" fill="none" strokeLinecap="round" />
      <path d={starPath(60, 4, 9, 4)} fill="#e3fc87" strokeWidth="2.5" />
    </g>
  ),
  body: <path d="M60 20 C92 18 108 44 104 74 C100 100 82 112 58 110 C32 108 14 94 16 66 C18 38 34 22 60 20Z" fill={color} {...S} />,
  eyes: [{ cx: 45, cy: 60, r: 14, p: 6.5 }, { cx: 75, cy: 60, r: 14, p: 6.5 }],
  mouth: { x: 60, y: 86, w: 10 },
  cheeks: '#ff7ccf',
});

export function AgentDoodle({ agent, size = 96, mood = 'happy', className = '', title, style, color }) {
  const ref = useRef(null);
  useGaze(ref);
  const s = SHAPES[agent] || (color ? customShape(color) : SHAPES.Mascot);
  const mouthColor = s.mouthColor || INK;
  return (
    <svg
      ref={ref}
      className={`doodle mood-${mood} ${className}`}
      width={size}
      height={size}
      viewBox="-12 -14 144 144"
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <g className="doodle-body">
        {s.back}
        {s.body}
        {s.cheeks && (
          <g fill={s.cheeks} opacity="0.6">
            <ellipse cx={s.eyes[0].cx - 6} cy={s.eyes[0].cy + s.eyes[0].r + 9} rx="8" ry="5" />
            <ellipse cx={s.eyes[1].cx + 6} cy={s.eyes[1].cy + s.eyes[1].r + 9} rx="8" ry="5" />
          </g>
        )}
        {s.eyes.map((e, i) => <Eye key={i} {...e} />)}
        {mood === 'worried' && <Brows eyes={s.eyes} color={mouthColor} />}
        <Mouth {...s.mouth} mood={mood} color={mouthColor} />
        {s.front}
      </g>
    </svg>
  );
}

/* ───────── Decorațiuni ───────── */
export function FlowerMark({ color = '#e3fc87', size = 22, className = '' }) {
  return (
    <svg className={`flower-mark ${className}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={flowerPath(12, 12, 4.2, 13.5, 6)} fill={color} />
    </svg>
  );
}

export function Star({ color = '#ff5a7a', size = 28, className = '', style }) {
  return (
    <svg className={`star ${className}`} width={size} height={size} viewBox="0 0 40 40" style={style} aria-hidden="true">
      <path d={starPath(20, 21, 15, 7)} fill={color} stroke={color} strokeWidth="5" strokeLinejoin="round" />
    </svg>
  );
}

const VINES = [
  'M14 396 C70 340 -6 290 52 236 S128 176 84 122 S28 46 116 8 M52 236 c34 -6 52 18 38 38 s-36 6 -26 -16 M84 122 c-30 4 -44 -22 -28 -38 s34 0 22 20',
  'M190 6 C136 58 204 112 140 152 S58 196 102 254 S176 334 88 396 M140 152 c-28 -14 -24 -46 2 -46 s28 30 4 34 M102 254 c30 -8 46 18 30 34 s-34 2 -22 -18',
];

export function Vine({ variant = 0, className = '', style }) {
  return (
    <svg className={`vine ${className}`} viewBox="0 0 200 400" style={style} aria-hidden="true">
      <path d={VINES[variant % VINES.length]} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
