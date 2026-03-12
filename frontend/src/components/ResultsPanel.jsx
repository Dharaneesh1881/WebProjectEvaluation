const BUCKET_LABELS = { html: 'HTML Structure', css: 'CSS Styling', js: 'JavaScript / Interactions', visual: 'Visual Match' };

export function ResultsPanel({ status, result }) {
  if (status === 'pending' || status === 'processing') {
    return (
      <div className="results-panel loading">
        <div className="spinner" />
        <p>{status === 'pending' ? 'Queued for evaluation...' : 'Evaluating your code...'}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="results-panel error">
        <p>Evaluation failed. Please try again.</p>
      </div>
    );
  }

  if (!result) return null;

  const { totalScore, breakdown } = result;
  const buckets = ['html', 'css', 'js', 'visual'];

  return (
    <div className="results-panel">
      <div className="total-score">
        <h2>Score: {totalScore} / 100</h2>
        <div className="score-bar-track">
          <div
            className="score-bar-fill"
            style={{ width: `${Math.min(totalScore, 100)}%` }}
          />
        </div>
      </div>

      {buckets.map(bucket => {
        const b = breakdown[bucket];
        if (!b) return null;
        return (
          <div key={bucket} className="bucket-section">
            <h3>
              {BUCKET_LABELS[bucket]}
              <span className="bucket-score">{b.score} / {b.maxScore}</span>
            </h3>

            {b.tests && b.tests.length > 0 && (
              <table className="test-table">
                <thead>
                  <tr>
                    <th>Test</th>
                    <th>Result</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {b.tests.map((t, i) => (
                    <tr key={i} className={t.passed ? 'pass' : 'fail'}>
                      <td>{t.name}</td>
                      <td>{t.passed ? '✓' : '✗'}</td>
                      <td>{t.earned} / {t.weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {bucket === 'visual' && b.diffPercent !== undefined && (
              <p className="diff-info">Pixel difference: {b.diffPercent}%</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
