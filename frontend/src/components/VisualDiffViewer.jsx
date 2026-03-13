import { useState } from 'react';

const TABS = [
  { key: 'reference', label: 'Expected' },
  { key: 'student',   label: 'Yours'    },
  { key: 'diff',      label: 'Diff'     }
];

export function VisualDiffViewer({ referenceScreenshotUrl, studentScreenshotUrl, diffImageUrl, diffPercent }) {
  const [active, setActive] = useState('reference');

  const urls = {
    reference: referenceScreenshotUrl,
    student:   studentScreenshotUrl,
    diff:      diffImageUrl
  };

  const activeUrl = urls[active];

  return (
    <div className="mt-2">
      <div className="flex border-b border-[var(--border-color)] mb-3">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-4 py-1.5 text-xs font-semibold border-b-2 transition-colors
              ${active === tab.key
                ? 'text-[#4e9af1] border-[#4e9af1]'
                : 'text-[var(--text-faint)] border-transparent hover:text-[var(--text-muted)]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeUrl ? (
        <img
          src={activeUrl}
          alt={active}
          className="w-full rounded-lg border border-[var(--border-color)]"
        />
      ) : (
        <div className="w-full h-40 rounded-lg border border-[var(--border-color)] flex items-center justify-center text-[var(--text-faint)] text-xs">
          {active === 'reference' ? 'No reference screenshot' :
           active === 'student'   ? 'No student screenshot' :
           'No diff image available'}
        </div>
      )}

      {diffPercent !== undefined && (
        <p className="mt-2 text-xs text-[var(--text-faint)]">Pixel difference: {diffPercent}%</p>
      )}
    </div>
  );
}
