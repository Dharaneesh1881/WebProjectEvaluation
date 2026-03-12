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
      <div className="flex border-b border-[#2a2a4a] mb-3">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-4 py-1.5 text-xs font-semibold border-b-2 transition-colors
              ${active === tab.key
                ? 'text-[#4e9af1] border-[#4e9af1]'
                : 'text-[#555] border-transparent hover:text-[#888]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeUrl ? (
        <img
          src={activeUrl}
          alt={active}
          className="w-full rounded-lg border border-[#2a2a4a]"
        />
      ) : (
        <div className="w-full h-40 rounded-lg border border-[#2a2a4a] flex items-center justify-center text-[#555] text-xs">
          {active === 'reference' ? 'No reference screenshot' :
           active === 'student'   ? 'No student screenshot' :
           'No diff image available'}
        </div>
      )}

      {diffPercent !== undefined && (
        <p className="mt-2 text-xs text-[#666]">Pixel difference: {diffPercent}%</p>
      )}
    </div>
  );
}
