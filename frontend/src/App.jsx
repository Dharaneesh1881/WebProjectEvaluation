import { useState, useEffect, useCallback } from 'react';
import { CodeEditor } from './components/CodeEditor.jsx';
import { ResultsPanel } from './components/ResultsPanel.jsx';
import { submitCode, getResult, socket } from './api/index.js';
import './App.css';

const INITIAL_FILES = { html: '', css: '', js: '' };

export default function App() {
  const [files, setFiles] = useState(INITIAL_FILES);
  const [submissionId, setSubmissionId] = useState(null);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const handleFileChange = useCallback((tab, value) => {
    setFiles(prev => ({ ...prev, [tab]: value }));
  }, []);

  const handleSubmit = async () => {
    setSubmitError(null);
    setResult(null);
    setSubmissionId(null);
    setStatus('pending');

    try {
      const { submissionId: id } = await submitCode(files);
      setSubmissionId(id);
    } catch (err) {
      setSubmitError(err.message);
      setStatus(null);
    }
  };

  // Listen for real-time completion from Socket.io
  useEffect(() => {
    if (!submissionId) return;

    const handler = async ({ submissionId: doneId }) => {
      if (doneId !== submissionId) return;
      const data = await getResult(doneId);
      if (data.status === 'done') {
        setStatus('done');
        setResult(data.result);
      } else {
        setStatus(data.status);
      }
    };

    socket.on('evaluation:complete', handler);
    return () => socket.off('evaluation:complete', handler);
  }, [submissionId]);

  const isEvaluating = status === 'pending' || status === 'processing';

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>Quiz App Evaluator</h1>
        <p>Recreate the <a href="https://github.com/Dharaneesh1881/Quiz" target="_blank" rel="noreferrer">Quiz project</a> and submit your code for evaluation.</p>
      </header>

      <main className="main-content">
        <section className="editor-section">
          <CodeEditor files={files} onChange={handleFileChange} />
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={isEvaluating}
          >
            {isEvaluating ? 'Evaluating...' : 'Submit for Evaluation'}
          </button>
          {submitError && <p className="error-msg">{submitError}</p>}
        </section>

        <section className="results-section">
          {status && <ResultsPanel status={status} result={result} />}
          {!status && (
            <div className="results-placeholder">
              <p>Your evaluation results will appear here after submission.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
