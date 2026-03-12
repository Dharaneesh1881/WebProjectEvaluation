import { useState } from 'react';

const TABS = ['html', 'css', 'js'];

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

export function CodeEditor({ files, onChange, readOnly = false }) {
  const [activeTab, setActiveTab] = useState('html');

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0d0d1a]">
      {/* File tabs */}
      <div className="flex shrink-0 border-b border-[#2a2a4a] bg-[#141424]">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2.5 text-xs font-semibold font-mono tracking-wider border-b-2 transition-colors ${activeTab === t
                ? `border-[#4e9af1] bg-[#1a1a2e] ${TAB_COLORS[t]}`
                : 'border-transparent text-[#666] hover:bg-[#1a1a2e] hover:text-[#bbb]'
              }`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Code area container */}
      <div className="flex-1 relative">
        <textarea
          key={activeTab}
          value={files[activeTab]}
          onChange={(e) => onChange?.(activeTab, e.target.value)}
          placeholder={PLACEHOLDERS[activeTab]}
          readOnly={readOnly}
          spellCheck={false}
          className={`absolute inset-0 w-full h-full p-4 bg-[#0d0d1a] border-none resize-none
                     text-[13px] font-mono leading-relaxed outline-none focus:ring-0
                     ${readOnly ? 'text-[#888] cursor-default' : 'text-[#e0e0e0]'}
                     placeholder-[#444] transition-colors`}
          style={{
            fontFamily: '"Fira Code", "JetBrains Mono", Consolas, monospace',
            tabSize: 2
          }}
        />
      </div>
    </div>
  );
}
