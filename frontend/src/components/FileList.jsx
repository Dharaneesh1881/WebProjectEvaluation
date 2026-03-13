import {
  formatFileSize,
  normalizeProjectFiles
} from '../utils/projectFiles.js';

const TYPE_STYLES = {
  html: {
    badge: 'bg-[#f2994a]/15 border-[#f2994a]/35 text-[#f2994a]',
    dot: 'bg-[#f2994a]'
  },
  css: {
    badge: 'bg-[#2d9cdb]/15 border-[#2d9cdb]/35 text-[#2d9cdb]',
    dot: 'bg-[#2d9cdb]'
  },
  js: {
    badge: 'bg-[#f2c94c]/15 border-[#f2c94c]/35 text-[#f2c94c]',
    dot: 'bg-[#f2c94c]'
  }
};

export function FileList({
  files,
  selectedFileName,
  onSelect,
  onRemove,
  onSetMain,
  readOnly = false
}) {
  const normalizedFiles = normalizeProjectFiles(files);

  if (normalizedFiles.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border-color)] px-4 py-6 text-center text-xs text-[var(--text-faint)]">
        No project files loaded yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-color)] overflow-hidden bg-[var(--bg-surface)]">
      <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-surface-alt)] flex items-center justify-between">
        <p className="text-xs font-semibold text-[var(--text-strong)]">Uploaded Files</p>
        <p className="text-[11px] text-[var(--text-faint)]">{normalizedFiles.length} file{normalizedFiles.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="divide-y divide-[var(--border-color)]">
        {normalizedFiles.map((file) => {
          const style = TYPE_STYLES[file.type];
          const isSelected = selectedFileName === file.name;

          return (
            <div
              key={file.name}
              className={`px-4 py-3 flex flex-wrap items-center gap-3 transition-colors ${isSelected ? 'bg-[#4e9af1]/8' : 'bg-[var(--bg-surface)]'
                }`}
            >
              <button
                type="button"
                onClick={() => onSelect?.(file.name)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${style.dot}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-strong)] truncate">{file.name}</p>
                  <p className="text-[11px] text-[var(--text-faint)]">{formatFileSize(file.content)}</p>
                </div>
              </button>
              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${style.badge}`}>
                  {file.type}
                </span>
                {file.isMain ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-[#3fb950]/30 bg-[#3fb950]/12 text-[#3fb950]">
                    main
                  </span>
                ) : onSetMain ? (
                  <button
                    type="button"
                    onClick={() => onSetMain(file.name)}
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-[var(--border-color)] text-[var(--text-faint)] hover:text-[#3fb950] hover:border-[#3fb950]/35 transition-colors"
                  >
                    Set main
                  </button>
                ) : null}
                {!readOnly && onRemove ? (
                  <button
                    type="button"
                    onClick={() => onRemove(file.name)}
                    className="rounded-full px-2 py-0.5 text-[11px] text-[var(--text-faint)] hover:text-[#f85149] hover:bg-[#f85149]/10 transition-colors"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
