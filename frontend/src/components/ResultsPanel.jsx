import { VisualDiffViewer } from './VisualDiffViewer.jsx';

// ── Bucket display config ──────────────────────────────────────────────────
const BUCKETS = [
  { key: 'linter',        label: 'Linter Quality',          max: 10  },
  { key: 'functionality', label: 'Functionality (Behavior)', max: 40  },
  { key: 'interaction',   label: 'Interaction Tests',        max: 15  },
  { key: 'visual',        label: 'Visual Layout Match',      max: 20  },
  { key: 'performance',   label: 'Performance',              max: 15  },
];

function scoreColor(pct) {
  return pct >= 80 ? '#3fb950' : pct >= 50 ? '#f0a500' : '#f85149';
}

// ── Linter sub-panel ───────────────────────────────────────────────────────
function LinterDetail({ b }) {
  const subs = [
    { label: 'HTMLHint',  data: b.htmlhint,  max: 3 },
    { label: 'Stylelint', data: b.stylelint, max: 3 },
    { label: 'ESLint',    data: b.eslint,    max: 4 },
  ];

  return (
    <div className="px-4 pb-4 space-y-3">
      {subs.map(({ label, data, max }) => {
        if (!data) return null;
        const pct = max > 0 ? (data.score / max) * 100 : 0;
        const col = scoreColor(pct);
        return (
          <div key={label} className="bg-[#0d0d1a] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#999]">{label}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: col, background: `${col}18` }}>
                {data.score}/{max}
              </span>
            </div>
            {data.errors?.length > 0 && (
              <ul className="space-y-0.5">
                {data.errors.map((e, i) => (
                  <li key={i} className="text-[10px] text-[#f85149] font-mono leading-relaxed">{e}</li>
                ))}
              </ul>
            )}
            {data.warnings?.length > 0 && (
              <ul className="space-y-0.5 mt-1">
                {data.warnings.map((w, i) => (
                  <li key={i} className="text-[10px] text-[#f0a500] font-mono leading-relaxed">{w}</li>
                ))}
              </ul>
            )}
            {data.errors?.length === 0 && data.warnings?.length === 0 && (
              <p className="text-[10px] text-[#3fb950]">No issues found</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Functionality test row ─────────────────────────────────────────────────
function FnTestRow({ t }) {
  const col = t.passed ? '#3fb950' : '#f85149';
  return (
    <div className="py-1.5 border-b border-[#1a1a2e] last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span className="text-sm font-bold mt-0.5 flex-shrink-0" style={{ color: col }}>
            {t.passed ? '✓' : '✗'}
          </span>
          <div className="min-w-0">
            <p className="text-xs text-[#ccc] font-medium truncate">{t.name}</p>
            {!t.passed && t.failHint && (
              <p className="text-[10px] text-[#f0a500] mt-0.5 leading-snug">{t.failHint}</p>
            )}
          </div>
        </div>
        <span className="text-xs font-bold flex-shrink-0" style={{ color: col }}>
          {t.earned}/{t.marks}
        </span>
      </div>
    </div>
  );
}

// ── Generic test row (interaction) ─────────────────────────────────────────
function TestRow({ t }) {
  const col = t.passed ? '#3fb950' : '#f85149';
  return (
    <tr style={{ color: col }}>
      <td className="py-1.5 pr-3 text-xs align-top">{t.name}</td>
      <td className="py-1.5 pr-3 text-center text-xs font-bold">{t.passed ? '✓' : '✗'}</td>
      <td className="py-1.5 text-xs text-right whitespace-nowrap">{t.earned}/{t.weight}</td>
    </tr>
  );
}

// ── Performance detail ─────────────────────────────────────────────────────
function PerformanceDetail({ b }) {
  const m = b.metrics ?? {};
  const items = [
    { label: 'Lighthouse Score',       value: b.performanceScore != null ? `${b.performanceScore}/100` : 'N/A' },
    { label: 'First Contentful Paint', value: m.fcp ?? '—' },
    { label: 'Speed Index',            value: m.si  ?? '—' },
    { label: 'Total Blocking Time',    value: m.tbt ?? '—' },
    ...(m.sizeKb  != null ? [{ label: 'File Size',  value: `${m.sizeKb} KB` }] : []),
    ...(m.domCount != null ? [{ label: 'DOM Nodes', value: String(m.domCount) }] : []),
  ];

  return (
    <div className="px-4 pb-4">
      <div className="bg-[#0d0d1a] rounded-lg overflow-hidden">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between px-3 py-2 border-b border-[#1a1a2e] last:border-0">
            <span className="text-xs text-[#888]">{item.label}</span>
            <span className="text-xs text-[#ccc] font-mono">{item.value}</span>
          </div>
        ))}
        {b.source === 'heuristic' && (
          <p className="px-3 py-2 text-[10px] text-[#f0a500]">
            * Lighthouse could not run — score estimated from code size
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main ResultsPanel ──────────────────────────────────────────────────────
export function ResultsPanel({ status, result }) {

  if (status === 'pending' || status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 pt-12 text-[#888]">
        <div className="w-9 h-9 rounded-full border-[3px] border-[#2a2a4a] border-t-[#4e9af1] animate-spin" />
        <p className="text-sm">
          {status === 'pending' ? 'Queued for evaluation…' : 'Evaluating your code…'}
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-4 rounded-lg bg-[#2a1010] border border-[#f85149]/40 text-[#f85149] text-sm">
        Evaluation failed. Please try again.
      </div>
    );
  }

  if (!result) return null;

  const { totalScore, breakdown } = result;
  const totalColor = scoreColor(totalScore);

  return (
    <div className="max-w-2xl space-y-4">

      {/* ── Total score card ── */}
      <div className="p-4 rounded-xl bg-[#1a1a2e] border border-[#2a2a4a]">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-bold text-white">Total Score</h2>
          <span className="text-2xl font-extrabold" style={{ color: totalColor }}>
            {totalScore} <span className="text-sm font-normal text-[#666]">/ 100</span>
          </span>
        </div>
        <div className="h-2.5 bg-[#2a2a4a] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${Math.min(totalScore, 100)}%`, background: 'linear-gradient(90deg,#2f80ed,#56ccf2)' }}
          />
        </div>

        {/* Mini score grid */}
        <div className="grid grid-cols-5 gap-2 mt-4">
          {BUCKETS.map(({ key, label, max }) => {
            const b   = breakdown?.[key];
            const sc  = b?.score ?? 0;
            const col = scoreColor(max > 0 ? (sc / max) * 100 : 0);
            return (
              <div key={key} className="text-center">
                <div className="text-[11px] font-bold" style={{ color: col }}>{sc}</div>
                <div className="text-[9px] text-[#555] leading-tight mt-0.5">{label.split(' ')[0]}</div>
                <div className="text-[9px] text-[#444]">/{max}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Per-bucket sections ── */}
      {BUCKETS.map(({ key, label, max }) => {
        const b = breakdown?.[key];
        if (!b) return null;

        const pct  = max > 0 ? (b.score / max) * 100 : 0;
        const col  = scoreColor(pct);

        return (
          <div key={key} className="rounded-xl bg-[#1a1a2e] border border-[#2a2a4a] overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a4a]">
              <h3 className="text-sm font-semibold text-[#c0c0c0]">{label}</h3>
              <span className="text-sm font-bold px-2 py-0.5 rounded-md"
                style={{ color: col, background: `${col}18` }}>
                {b.score} / {b.maxScore}
              </span>
            </div>

            {/* ── Linter: sub-tool breakdown ── */}
            {key === 'linter' && <LinterDetail b={b} />}

            {/* ── Functionality: test case list ── */}
            {key === 'functionality' && (
              <div className="px-4 py-2">
                {b.tests && b.tests.length > 0 ? (
                  <>
                    <p className="text-[10px] text-[#555] mb-2">
                      Passed {b.tests.filter(t => t.passed).length}/{b.tests.length} test cases
                      {b.rawMax !== 40 && b.rawMax > 0 && (
                        <span className="ml-1">(scaled from {b.earned}/{b.rawMax} → {b.score}/40)</span>
                      )}
                    </p>
                    <div>
                      {b.tests.map((t, i) => <FnTestRow key={i} t={t} />)}
                    </div>
                  </>
                ) : (
                  <p className="py-3 text-xs text-[#555]">No functionality tests defined for this assignment.</p>
                )}
              </div>
            )}

            {/* ── Interaction: table ── */}
            {key === 'interaction' && b.tests?.length > 0 && (
              <div className="px-4 py-2 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[#555] border-b border-[#2a2a4a]">
                      <th className="text-left text-[10px] pb-1.5 pr-3 font-semibold uppercase tracking-wider">Test</th>
                      <th className="text-center text-[10px] pb-1.5 pr-3 font-semibold uppercase tracking-wider">Result</th>
                      <th className="text-right text-[10px] pb-1.5 font-semibold uppercase tracking-wider">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.tests.map((t, i) => <TestRow key={i} t={t} />)}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Visual: diff images ── */}
            {key === 'visual' && (
              <div className="px-4 pb-4">
                <p className="text-[10px] text-[#555] mt-2 mb-3">
                  Pixel difference: <span className="text-[#ccc]">{b.diffPercent}%</span>
                  <span className="ml-2">(grayscale layout comparison)</span>
                </p>
                <VisualDiffViewer
                  referenceScreenshotUrl={b.referenceScreenshotUrl}
                  studentScreenshotUrl={b.studentScreenshotUrl}
                  diffImageUrl={b.diffImageUrl}
                  diffPercent={b.diffPercent}
                />
              </div>
            )}

            {/* ── Performance: metrics table ── */}
            {key === 'performance' && <PerformanceDetail b={b} />}

          </div>
        );
      })}
    </div>
  );
}
