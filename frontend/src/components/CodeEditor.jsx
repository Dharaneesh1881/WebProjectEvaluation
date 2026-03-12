import { useState } from 'react';

const TABS = ['html', 'css', 'js'];

const PLACEHOLDERS = {
  html: '<!-- Paste your HTML body content here -->\n<div class="title">\n  <h1>Quizz</h1>\n</div>',
  css:  '/* Paste your CSS here */\nbody {\n  display: flex;\n}',
  js:   '// Paste your JavaScript here\nlet currentQuiz = 0;'
};

export function CodeEditor({ files, onChange }) {
  const [activeTab, setActiveTab] = useState('html');

  return (
    <div className="editor-container">
      <div className="tab-bar">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>
      <textarea
        className="code-area"
        value={files[activeTab]}
        onChange={(e) => onChange(activeTab, e.target.value)}
        spellCheck={false}
        placeholder={PLACEHOLDERS[activeTab]}
      />
    </div>
  );
}
