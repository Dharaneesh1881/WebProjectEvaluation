import { VisualDiffViewer } from './VisualDiffViewer.jsx';

const BUCKET_LABELS = {
  html: 'HTML Structure',
  css: 'CSS Styling',
  js: 'JavaScript / Interactions',
  visual: 'Visual Match',
};

function ScoreRow({ t, i }) {
  return (
    <tr
      key={i}
      className={t.passed
        ? 'text-[#3fb950]'
        : 'text-[#f85149]'}
    >
      <td className="py-1.5 pr-3 text-xs align-top">{t.name}</td>
      <td className="py-1.5 pr-3 text-center text-xs font-bold">
        {t.passed ? '✓' : '✗'}
      </td>
      <td className="py-1.5 text-xs text-right whitespace-nowrap">
        {t.earned} / {t.weight}
      </td>
    </tr>
  );
}

export function ResultsPanel({ status, result }) {
  /* Loading state */
  if (status === 'pending' || status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 pt-12 text-[#888]">
        <div className="w-9 h-9 rounded-full border-[3px] border-[#2a2a4a] border-t-[#4e9af1]
                        animate-spin" />
        <p className="text-sm">
          {status === 'pending' ? 'Queued for evaluation…' : 'Evaluating your code…'}
        </p>
      </div>
    );
  }

  /* Error state */
  if (status === 'error') {
    return (
      <div className="p-4 rounded-lg bg-[#2a1010] border border-[#f85149]/40 text-[#f85149] text-sm">
        Evaluation failed. Please try again.
      </div>
    );
  }

  if (!result) return null;

  const { totalScore, breakdown } = result;
  const buckets = ['html', 'css', 'js', 'visual'];

  const scoreColor =
    totalScore >= 80 ? 'text-[#3fb950]' :
      totalScore >= 50 ? 'text-[#f0a500]' :
        'text-[#f85149]';

  return (
    <div className="max-w-2xl space-y-4">

      {/* ── Total score ── */}
      <div className="p-4 rounded-xl bg-[#1a1a2e] border border-[#2a2a4a]">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-bold text-white">Total Score</h2>
          <span className={`text-2xl font-extrabold ${scoreColor}`}>
            {totalScore} <span className="text-sm font-normal text-[#666]">/ 100</span>
          </span>
        </div>
        <div className="h-2.5 bg-[#2a2a4a] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.min(totalScore, 100)}%`,
              background: 'linear-gradient(90deg, #2f80ed, #56ccf2)',
            }}
          />
        </div>
      </div>

      {/* ── Bucket sections ── */}
      {buckets.map(bucket => {
        const b = breakdown?.[bucket];
        if (!b) return null;

        const pct = b.maxScore > 0 ? (b.score / b.maxScore) * 100 : 0;
        const bucketColor =
          pct >= 80 ? '#3fb950' :
            pct >= 50 ? '#f0a500' :
              '#f85149';

        return (
          <div
            key={bucket}
            className="rounded-xl bg-[#1a1a2e] border border-[#2a2a4a] overflow-hidden"
          >
            {/* Bucket header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a4a]">
              <h3 className="text-sm font-semibold text-[#c0c0c0]">
                {BUCKET_LABELS[bucket]}
              </h3>
              <span
                className="text-sm font-bold px-2 py-0.5 rounded-md"
                style={{ color: bucketColor, background: `${bucketColor}18` }}
              >
                {b.score} / {b.maxScore}
              </span>
            </div>

            {/* Tests */}
            {b.tests && b.tests.length > 0 && (
              <div className="px-4 py-2 overflow-x-auto scrollbar-thin">
                <table className="w-full">
                  <thead>
                    <tr className="text-[#555] border-b border-[#2a2a4a]">
                      <th className="text-left text-[10px] pb-1.5 pr-3 font-semibold uppercase tracking-wider">
                        Test
                      </th>
                      <th className="text-center text-[10px] pb-1.5 pr-3 font-semibold uppercase tracking-wider">
                        Result
                      </th>
                      <th className="text-right text-[10px] pb-1.5 font-semibold uppercase tracking-wider">
                        Points
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.tests.map((t, i) => <ScoreRow key={i} t={t} i={i} />)}
                  </tbody>
                </table>
              </div>
            )}

            {/* Visual diff — three-tab image viewer */}
            {bucket === 'visual' && (
              <div className="px-4 pb-4">
                <VisualDiffViewer
                  referenceScreenshotUrl={b.referenceScreenshotUrl}
                  studentScreenshotUrl={b.studentScreenshotUrl}
                  diffImageUrl={b.diffImageUrl}
                  diffPercent={b.diffPercent}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
