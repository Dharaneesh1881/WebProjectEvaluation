import { useState } from 'react';
import { normalizeProjectFiles } from '../utils/projectFiles.js';

const PLACEHOLDERS = {
  html: '<!-- Paste your HTML body content here -->\n<div class="title">\n  <h1>Quizz</h1>\n</div>',
  css: '/* Paste your CSS here */\nbody {\n  display: flex;\n}',
  js: '// Paste your JavaScript here\nlet currentQuiz = 0;',
};

const TAB_COLORS = {
  html: 'text-[#e44d26]',
  css: 'text-[#264de4]',
  js: 'text-[#f7df1e]',
};

export function CodeEditor({ files, onChange, readOnly = false, selectedFileName = null, onSelectFile }) {
  const normalizedFiles = normalizeProjectFiles(files);
  const [internalActiveFileName, setInternalActiveFileName] = useState(null);

  if (normalizedFiles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--bg-surface)] text-center px-6">
        <div>
          <p className="text-sm font-semibold text-[var(--text-strong)] mb-1">No editable files loaded</p>
          <p className="text-xs text-[var(--text-faint)]">Upload project files to start editing.</p>
        </div>
      </div>
    );
  }

  const selectedActiveFile = selectedFileName && normalizedFiles.some((file) => file.name === selectedFileName)
    ? selectedFileName
    : null;

  const internalActiveFile = internalActiveFileName && normalizedFiles.some((file) => file.name === internalActiveFileName)
    ? internalActiveFileName
    : null;

  const activeFileName = selectedActiveFile || internalActiveFile || normalizedFiles[0].name;
  const activeFile = normalizedFiles.find((file) => file.name === activeFileName) || normalizedFiles[0];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-surface)]">
      {/* File tabs */}
      <div className="flex shrink-0 border-b border-[var(--border-color)] bg-[#141424] overflow-x-auto">
        {normalizedFiles.map((file) => (
          <button
            key={file.name}
            type="button"
            onClick={() => {
              setInternalActiveFileName(file.name);
              onSelectFile?.(file.name);
            }}
            className={`px-4 py-2.5 text-xs font-semibold font-mono tracking-wider border-b-2 transition-colors whitespace-nowrap ${activeFile.name === file.name
              ? `border-[#4e9af1] bg-[var(--bg-surface-alt)] ${TAB_COLORS[file.type]}`
              : 'border-transparent text-[var(--text-faint)] hover:bg-[var(--bg-surface-alt)] hover:text-[#bbb]'
              }`}
          >
            {file.name}
          </button>
        ))}
      </div>

      {/* Code area container */}
      <div className="flex-1 relative">
        <textarea
          key={activeFile.name}
          value={activeFile.content}
          onChange={(e) => onChange?.(activeFile.name, e.target.value)}
          placeholder={PLACEHOLDERS[activeFile.type]}
          readOnly={readOnly}
          spellCheck={false}
          className={`absolute inset-0 w-full h-full overflow-auto scrollbar-thin p-4 pr-5 bg-[var(--bg-surface)] border-none resize-none
                     text-[13px] font-mono leading-relaxed outline-none focus:ring-0
                     ${readOnly ? 'text-[var(--text-muted)] cursor-default' : 'text-[var(--text-main)]'}
                     placeholder-[var(--text-faintest)] transition-colors`}
          style={{
            fontFamily: '"Fira Code", "JetBrains Mono", Consolas, monospace',
            tabSize: 2
          }}
        />
      </div>
    </div>
  );
}
