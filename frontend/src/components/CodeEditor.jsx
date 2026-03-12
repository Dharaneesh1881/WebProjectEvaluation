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

export function CodeEditor({ files, onChange }) {
  const [activeTab, setActiveTab] = useState('html');

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* Tab bar */}
      <div className="flex shrink-0 bg-[#1a1a2e] border-b border-[#2a2a4a]">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'px-4 py-2.5 text-xs font-bold tracking-widest uppercase transition-colors duration-150',
              'border-b-2 focus:outline-none',
              activeTab === tab
                ? `${TAB_COLORS[tab]} border-current bg-[#0d0d1a]`
                : 'text-[#666] border-transparent hover:text-[#bbb] hover:bg-[#151525]',
            ].join(' ')}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Code textarea */}
      <textarea
        className="flex-1 resize-none bg-[#0d0d1a] text-[#c9d1d9] border-none outline-none
                   p-4 font-mono text-sm leading-relaxed scrollbar-thin
                   placeholder:text-[#3a3a5a]"
        style={{ fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace" }}
        value={files[activeTab]}
        onChange={e => onChange(activeTab, e.target.value)}
        spellCheck={false}
        placeholder={PLACEHOLDERS[activeTab]}
      />
    </div>
  );
}
